#!/usr/bin/env bun
/**
 * PicHaus restore wizard.
 *
 * Usage:
 *   bun run tools/restore.ts <archive>                          guided wizard
 *   bun run tools/restore.ts <archive> --yes --db-url <url>     non-interactive
 *   bun run tools/restore.ts <archive> --dry-run --yes          validate only
 *
 * Non-interactive flags:
 *   --yes                 accept every wizard default
 *   --db-url <url>        target database connection string
 *   --storage-dir <dir>   target local storage directory
 *   --docker-volume <vol> restore storage.tar into a Docker named volume
 *   --passphrase-file <f> read the gpg decryption passphrase from a file
 *   --overwrite           skip the typed OVERWRITE safety gates
 *   --no-env              do not write a patched .env
 *   --dry-run             decrypt, extract, verify, and show the plan, then stop
 *
 * The archive layout and manifest schema are described in tools/lib/backup.ts.
 * All commands are spawned with argument arrays; connection strings and
 * passphrases are never interpolated into shell strings.
 */

import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

import {
  RestoreError,
  type EnvSnapshot,
  type ExtractedArchive,
  type HealthResult,
  type Manifest,
  type RestorePlan,
  type SafetyGate,
  type StorageTarget,
  cleanupTempRoot,
  checkStorageTarget,
  checkTargetDatabase,
  createTempRoot,
  decryptArchive,
  ensureDockerAvailable,
  executeRestore,
  extractArchive,
  formatBytes,
  hostFromDatabaseUrl,
  isEncryptedArchive,
  isWritableDirectory,
  listDockerVolumes,
  loadEnvSnapshot,
  maskDatabaseUrl,
  preflight,
  resolveLocalStorageDir,
  runHealthCheck,
  suggestDockerVolumes,
  verifyChecksums,
  webauthnDefaults,
} from './lib/restore.ts'

interface CliOptions {
  archivePath: string
  yes: boolean
  dryRun: boolean
  dbUrl: string | undefined
  storageDir: string | undefined
  dockerVolume: string | undefined
  passphraseFile: string | undefined
  overwrite: boolean
  noEnv: boolean
}

interface HiddenReadline {
  _writeToOutput: (value: string) => void
}

const stepsTotal = 8
let currentStep = 0
let readline: ReturnType<typeof createInterface> | undefined
let tempRoot: string | undefined
let signalCleanedUp = false

function step(description: string): void {
  currentStep += 1
  console.log(`\n[${currentStep}/${stepsTotal}] ${description}`)
}

function fail(message: string): never {
  process.exitCode = 1
  throw new RestoreError(message)
}

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2))

  console.log('PicHaus restore')
  console.log('Restores a database, storage directory, and optional .env from a PicHaus backup archive.')

  try {
    step('Preflight...')
    const pre = await preflight(cli.archivePath)
    console.log(`  Archive:    ${pre.archivePath}`)
    console.log(`  pg_restore: ${pre.pgRestorePath}`)
    console.log(`  psql:       ${pre.psqlPath}`)
    console.log(`  tar:        ${pre.tarPath}`)

    tempRoot = await createTempRoot()

    step('Preparing archive...')
    let plainArchive: string | undefined
    if (isEncryptedArchive(pre.archivePath)) {
      console.log('  Encrypted backup detected (gpg AES256 symmetric).')
      if (cli.passphraseFile) {
        const passphrase = await readPassphraseFile(cli.passphraseFile)
        plainArchive = await decryptArchive(pre.archivePath, tempRoot, passphrase)
      } else if (cli.yes) {
        fail('Encrypted archive requires --passphrase-file in non-interactive mode.')
      } else {
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          const passphrase = await askMasked(
            `Enter decryption passphrase (attempt ${attempt}/3): `,
            undefined,
          )
          if (!passphrase) fail('Restore cancelled.')
          try {
            plainArchive = await decryptArchive(pre.archivePath, tempRoot, passphrase)
            break
          } catch (error) {
            if (attempt < 3) {
              console.log(`  Wrong passphrase or decryption failed; ${3 - attempt} attempt(s) left.`)
            } else {
              throw error
            }
          }
        }
      }
      console.log('  Archive decrypted successfully.')
    } else {
      plainArchive = pre.archivePath
      console.log('  Plain backup archive; no decryption needed.')
    }
    if (!plainArchive) fail('Could not decrypt the archive.')

    step('Extracting archive and reading manifest...')
    const extracted = await extractArchive(plainArchive, tempRoot)
    printManifestSummary(extracted.manifest)

    step('Verifying checksums...')
    await verifyChecksums(extracted.stagingDir, extracted.manifest)
    console.log('  All manifest checksums verified.')

    step('Configuring restore target...')
    const envSnapshot = await loadEnvSnapshot(process.cwd(), extracted.envBackupPath)
    const plan = cli.yes
      ? await buildCliPlan(cli, envSnapshot, extracted)
      : await runConfigWizard(cli, envSnapshot, extracted)
    printPlan(plan)

    if (cli.dryRun) {
      console.log()
      console.log('Dry run complete. No database, storage, or .env changes were made.')
      return
    }

    step('Safety checks and final confirmation...')
    await checkSafety(plan, cli)
    if (!cli.yes) {
      const confirm = await ask('Proceed with restore? [Y/n]: ', 'y')
      if (!isAffirmative(confirm)) fail('Restore cancelled by user.')
    }

    step('Executing restore...')
    await executeRestore(plan)

    step('Running health checks...')
    const health = await runHealthCheck(plan)
    printHealth(health)
    if (!health.ok) {
      console.error()
      console.error(
        'WARNING: Restore completed, but one or more health checks failed. Inspect before starting the app.',
      )
      process.exitCode = 1
    }

    printFinalReport(plan)
  } finally {
    closeReadline()
    await cleanupTempRoot(tempRoot)
  }
}

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    archivePath: '',
    yes: false,
    dryRun: false,
    dbUrl: undefined,
    storageDir: undefined,
    dockerVolume: undefined,
    passphraseFile: undefined,
    overwrite: false,
    noEnv: false,
  }

  const valueFlags = new Set(['--db-url', '--storage-dir', '--docker-volume', '--passphrase-file'])
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    } else if (arg === '--yes') {
      options.yes = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--overwrite') {
      options.overwrite = true
    } else if (arg === '--no-env') {
      options.noEnv = true
    } else if (valueFlags.has(arg)) {
      const value = args[i + 1]
      if (!value || value.startsWith('--')) fail(`${arg} requires a value.`)
      setCliValue(options, arg, value)
      i += 1
    } else if (arg.startsWith('--db-url=')) {
      options.dbUrl = arg.slice('--db-url='.length)
    } else if (arg.startsWith('--storage-dir=')) {
      options.storageDir = arg.slice('--storage-dir='.length)
    } else if (arg.startsWith('--docker-volume=')) {
      options.dockerVolume = arg.slice('--docker-volume='.length)
    } else if (arg.startsWith('--passphrase-file=')) {
      options.passphraseFile = arg.slice('--passphrase-file='.length)
    } else if (arg.startsWith('-')) {
      fail(`Unknown argument: ${arg}`)
    } else if (!options.archivePath) {
      options.archivePath = arg
    } else {
      fail(`Unexpected extra argument: ${arg}`)
    }
  }

  if (!options.archivePath) {
    printUsage()
    fail('Missing archive path.')
  }
  return options
}

function setCliValue(options: CliOptions, flag: string, value: string): void {
  if (flag === '--db-url') options.dbUrl = value
  else if (flag === '--storage-dir') options.storageDir = value
  else if (flag === '--docker-volume') options.dockerVolume = value
  else if (flag === '--passphrase-file') options.passphraseFile = value
}

function printUsage(): void {
  console.log(
    [
      'PicHaus restore',
      '',
      'Usage: bun run tools/restore.ts <archive> [options]',
      '',
      'Options:',
      '  --yes                 accept every wizard default (non-interactive)',
      '  --db-url <url>        target database connection string',
      '  --storage-dir <dir>   target local storage directory',
      '  --docker-volume <vol> restore storage.tar into a Docker named volume',
      '  --passphrase-file <f> read the gpg decryption passphrase from a file',
      '  --overwrite           skip the typed OVERWRITE safety gates',
      '  --no-env              do not write a patched .env',
      '  --dry-run             decrypt, extract, verify, and show the plan, then stop',
      '  --help                show this help',
    ].join('\n'),
  )
}

async function buildCliPlan(
  cli: CliOptions,
  envSnapshot: EnvSnapshot,
  extracted: ExtractedArchive,
): Promise<RestorePlan> {
  const databaseUrl = cli.dbUrl ?? envSnapshot.databaseUrl ?? process.env.DATABASE_URL
  if (!databaseUrl) {
    fail(
      'No DATABASE_URL available. Pass --db-url or restore an archive containing env.backup with DATABASE_URL.',
    )
  }

  let storageTarget: StorageTarget
  if (cli.dockerVolume) {
    await ensureDockerAvailable()
    storageTarget = { type: 'docker', volume: cli.dockerVolume }
  } else {
    const dir = resolveLocalStorageDir(
      process.cwd(),
      cli.storageDir ?? envSnapshot.storageDir ?? 'storage/uploads',
    )
    if (!(await isWritableDirectory(dir))) {
      fail(
        `Storage directory is not writable: ${dir}. Pass --docker-volume <name> or a writable --storage-dir.`,
      )
    }
    storageTarget = { type: 'local', dir }
  }

  const writeEnv = !cli.noEnv && envSnapshot.source === 'archive'
  if (cli.noEnv) {
    console.log('  .env restore skipped (--no-env).')
  } else if (envSnapshot.source !== 'archive') {
    console.log('  No env.backup in archive; skipping .env restore.')
  }

  return {
    repoRoot: process.cwd(),
    databaseUrl,
    storageTarget,
    extracted,
    envSnapshot,
    writeEnv,
    webauthnRpId: undefined,
    webauthnOrigin: undefined,
    envBackupName: undefined,
  }
}

async function runConfigWizard(
  cli: CliOptions,
  envSnapshot: EnvSnapshot,
  extracted: ExtractedArchive,
): Promise<RestorePlan> {
  const defaultDatabaseUrl =
    cli.dbUrl ?? envSnapshot.databaseUrl ?? process.env.DATABASE_URL
  if (!defaultDatabaseUrl) {
    fail(
      'No DATABASE_URL available. Pass --db-url or restore an archive containing env.backup with DATABASE_URL.',
    )
  }
  const databaseUrl = await ask(
    `Target DATABASE_URL [${maskDatabaseUrl(defaultDatabaseUrl)}]: `,
    defaultDatabaseUrl,
  )

  const defaultStorageDir = resolveLocalStorageDir(
    process.cwd(),
    cli.storageDir ?? envSnapshot.storageDir ?? 'storage/uploads',
  )
  const storageAnswer = await ask(
    `Target storage directory [${defaultStorageDir}]: `,
    defaultStorageDir,
  )
  const dockerAnswer = await ask('Restore into a Docker named volume? [y/N]: ', 'n')

  let storageTarget: StorageTarget
  if (isAffirmative(dockerAnswer)) {
    storageTarget = { type: 'docker', volume: await chooseDockerVolume() }
  } else {
    const dir = resolveLocalStorageDir(process.cwd(), storageAnswer)
    if (!(await isWritableDirectory(dir))) {
      console.log(`  Warning: cannot write to ${dir}.`)
      const dockerFallback = await ask('Restore into a Docker named volume instead? [Y/n]: ', 'y')
      if (isAffirmative(dockerFallback)) {
        storageTarget = { type: 'docker', volume: await chooseDockerVolume() }
      } else {
        fail(`Storage directory is not writable: ${dir}. Choose a writable --storage-dir or --docker-volume.`)
      }
    } else {
      storageTarget = { type: 'local', dir }
    }
  }

  let writeEnv = false
  let webauthnRpId: string | undefined
  let webauthnOrigin: string | undefined
  if (envSnapshot.source === 'archive') {
    const envAnswer = await ask(
      'Write a fresh .env from env.backup, patching DATABASE_URL? [Y/n]: ',
      'y',
    )
    writeEnv = isAffirmative(envAnswer)
    if (
      writeEnv &&
      (envSnapshot.values.WEBAUTHN_RP_ID !== undefined ||
        envSnapshot.values.WEBAUTHN_ORIGIN !== undefined)
    ) {
      const host = hostFromDatabaseUrl(databaseUrl)
      const updateAnswer = await ask(
        `Update WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN for the new host${host ? ` (${host})` : ''}? [y/N]: `,
        'n',
      )
      if (isAffirmative(updateAnswer)) {
        const defaults = webauthnDefaults(databaseUrl, envSnapshot.values.WEBAUTHN_ORIGIN)
        webauthnRpId = await ask(`WEBAUTHN_RP_ID [${defaults.rpId}]: `, defaults.rpId)
        webauthnOrigin = await ask(`WEBAUTHN_ORIGIN [${defaults.origin}]: `, defaults.origin)
      }
    }
  } else if (envSnapshot.source === 'local') {
    const envAnswer = await ask(
      'No env.backup in archive. Patch the local .env DATABASE_URL instead? [y/N]: ',
      'n',
    )
    writeEnv = isAffirmative(envAnswer)
  } else {
    console.log('  No .env source available; skipping .env restore.')
  }

  return {
    repoRoot: process.cwd(),
    databaseUrl,
    storageTarget,
    extracted,
    envSnapshot,
    writeEnv,
    webauthnRpId,
    webauthnOrigin,
    envBackupName: undefined,
  }
}

async function chooseDockerVolume(): Promise<string> {
  await ensureDockerAvailable()
  const volumes = await listDockerVolumes()
  const suggested = suggestDockerVolumes(volumes)
  if (suggested.length > 0) {
    console.log('  Detected Docker volumes:')
    suggested.forEach((name, index) => console.log(`    ${index + 1}) ${name}`))
    const answer = await ask(`Docker volume name [${suggested[0]}]: `, suggested[0])
    return answer
  }
  if (volumes.length > 0) {
    console.log('  No obviously matching Docker volumes found. All volumes:')
    volumes.slice(0, 12).forEach((name, index) => console.log(`    ${index + 1}) ${name}`))
  } else {
    console.log('  No Docker volumes found; Docker will create the volume when the restore starts.')
  }
  const answer = await ask('Docker volume name: ', '')
  if (!answer) fail('A Docker volume name is required.')
  return answer
}

async function checkSafety(plan: RestorePlan, cli: CliOptions): Promise<SafetyGate> {
  console.log('  Checking target database...')
  const database = await checkTargetDatabase(plan.databaseUrl)
  if (database.hasTables) {
    const details = database.tables
      .map((table) => `  ${table.name}: ${table.count} rows`)
      .join('\n')
    if (cli.yes && !cli.overwrite) {
      fail(
        'Target database already contains PicHaus tables. Pass --overwrite to proceed in non-interactive mode.',
      )
    }
    await requireOverwrite(
      `Target database ${maskDatabaseUrl(plan.databaseUrl)} already contains PicHaus tables.`,
      `Restoring will drop and recreate these tables:\n${details}`,
    )
  } else {
    console.log(`  Target database ${maskDatabaseUrl(plan.databaseUrl)} has no existing PicHaus tables.`)
  }

  console.log('  Checking target storage...')
  const storage = await checkStorageTarget(plan.storageTarget)
  const targetLabel =
    plan.storageTarget.type === 'local'
      ? plan.storageTarget.dir
      : `Docker volume ${plan.storageTarget.volume}`
  if (storage.nonEmpty) {
    const shown = storage.entries.map((entry) => `  ${entry}`).join('\n')
    if (cli.yes && !cli.overwrite) {
      fail(`Target storage ${targetLabel} is not empty. Pass --overwrite to proceed in non-interactive mode.`)
    }
    await requireOverwrite(
      `Target storage ${targetLabel} is not empty.`,
      `Restore will clear and replace it. Existing entries include:\n${shown}`,
    )
  } else {
    console.log(`  Target storage ${targetLabel} is empty or new.`)
  }

  return { database, storage }
}

function printManifestSummary(manifest: Manifest): void {
  console.log(`  Backup created:  ${manifest.createdAt ?? 'unknown'}`)
  console.log(`  App version:     ${manifest.appVersion ?? 'unknown'}`)
  if (manifest.gitSha) console.log(`  Git SHA:         ${String(manifest.gitSha)}`)
  console.log(`  PostgreSQL:      ${manifest.postgresVersion ?? 'unknown'}`)
  console.log(`  Storage driver:  ${manifest.storageDriver ?? 'unknown'}`)
  console.log(`  Photos:          ${manifest.counts?.photos ?? 'unknown'}`)
  console.log(`  Storage files:   ${manifest.counts?.files ?? 'unknown'}`)
  const sizeParts = Object.entries(manifest.sizes ?? {})
    .map(([name, bytes]) => `${name}: ${formatBytes(numberOrUndefined(bytes) ?? 0)}`)
  if (sizeParts.length > 0) console.log(`  Sizes:           ${sizeParts.join(', ')}`)
}

function printPlan(plan: RestorePlan): void {
  console.log()
  console.log('Restore plan:')
  console.log(`  Archive:    ${plan.extracted.plainArchivePath}`)
  console.log(`  Database:   ${maskDatabaseUrl(plan.databaseUrl)}`)
  console.log(
    `  Storage:    ${
      plan.storageTarget.type === 'local'
        ? plan.storageTarget.dir
        : `Docker volume ${plan.storageTarget.volume}`
    }`,
  )
  console.log(`  Write .env: ${plan.writeEnv ? 'yes' : 'no'}`)
  if (plan.writeEnv && (plan.webauthnRpId || plan.webauthnOrigin)) {
    console.log('  WebAuthn:   update RP_ID/ORIGIN for the new host')
  }
  if (plan.storageTarget.type === 'docker') {
    console.log(
      '  Docker note: point DATABASE_URL at the published Postgres port (for example localhost:5432) or run this tool via docker exec.',
    )
  }
}

function printHealth(health: HealthResult): void {
  for (const check of health.checks) {
    const status =
      check.status === 'pass' ? 'PASS' : check.status === 'fail' ? 'FAIL' : 'WARN'
    const expected = check.expected ? ` (expected ${check.expected})` : ''
    console.log(`  ${status} ${check.name}: ${check.actual}${expected}`)
  }
}

function printFinalReport(plan: RestorePlan): void {
  console.log()
  console.log('Restore complete.')
  console.log(`  Database: ${maskDatabaseUrl(plan.databaseUrl)}`)
  console.log(
    `  Storage:  ${
      plan.storageTarget.type === 'local'
        ? plan.storageTarget.dir
        : `Docker volume ${plan.storageTarget.volume}`
    }`,
  )
  console.log(
    `  .env:     ${
      plan.writeEnv
        ? `written; previous saved as ${plan.envBackupName ?? 'n/a'}`
        : 'not written'
    }`,
  )
  console.log()
  console.log('Next steps:')
  console.log(`  1. cd ${process.cwd()}`)
  console.log('  2. bun install')
  console.log('  3. bun dev          # development')
  console.log('     bun run build    # production build')
  if (plan.storageTarget.type === 'docker') {
    console.log(
      '  4. Start the app with the restored Docker volume attached and DATABASE_URL pointing at Postgres.',
    )
  }
}

async function requireOverwrite(title: string, details: string): Promise<void> {
  console.log()
  console.log(`WARNING: ${title}`)
  console.log(details)
  while (true) {
    const answer = await ask('Type OVERWRITE to continue, or n to cancel: ', 'n')
    if (answer === 'OVERWRITE') return
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') fail('Restore cancelled by user.')
    console.log('  Please type OVERWRITE to continue, or n to cancel.')
  }
}

async function readPassphraseFile(filePath: string): Promise<string> {
  try {
    const contents = await readFile(filePath, 'utf8')
    return contents.replace(/\r?\n$/, '')
  } catch (error) {
    fail(`Could not read passphrase file ${filePath}: ${errorMessage(error)}`)
  }
}

async function ask(prompt: string, defaultValue: string): Promise<string> {
  if (!readline) readline = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await readline.question(prompt)
  const trimmed = answer.trim()
  return trimmed.length > 0 ? trimmed : defaultValue
}

async function askMasked(
  prompt: string,
  defaultValue: string | undefined,
): Promise<string | undefined> {
  if (readline) {
    readline.close()
    readline = undefined
  }
  process.stdout.write(prompt)
  const input = process.stdin
  if (input.isTTY && typeof input.setRawMode === 'function') {
    input.setRawMode(true)
    input.resume()
    return await new Promise<string | undefined>((resolve, reject) => {
      let value = ''
      let settled = false

      const cleanup = () => {
        input.removeListener('data', onData)
        try {
          input.setRawMode(false)
        } catch {
          // Terminal may already be closed.
        }
        input.pause()
        readline = createInterface({ input: process.stdin, output: process.stdout })
      }

      const finish = (result: string | undefined) => {
        if (settled) return
        settled = true
        process.stdout.write('\n')
        cleanup()
        resolve(result)
      }

      const fail = (message: string) => {
        if (settled) return
        settled = true
        cleanup()
        reject(new RestoreError(message))
      }

      const onData = (chunk: Buffer) => {
        for (const char of chunk.toString('utf8')) {
          if (char === '\r' || char === '\n') {
            finish(value.trim() || defaultValue)
            return
          }
          if (char === '\u0003') {
            fail('Restore cancelled by user.')
            return
          }
          if (char === '\u0004') {
            finish(value.trim() || defaultValue)
            return
          }
          if (char === '\u007f' || char === '\b') {
            value = value.slice(0, -1)
          } else if (char >= ' ') {
            value += char
          }
        }
      }

      input.on('data', onData)
    })
  }

  const hidden = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })
  ;(hidden as unknown as HiddenReadline)._writeToOutput = () => {}
  try {
    const answer = await hidden.question('')
    process.stdout.write('\n')
    const trimmed = answer.trim()
    return trimmed.length > 0 ? trimmed : defaultValue
  } finally {
    hidden.close()
    readline = createInterface({ input: process.stdin, output: process.stdout })
  }
}

function closeReadline(): void {
  if (readline) {
    readline.close()
    readline = undefined
  }
}

function isAffirmative(answer: string): boolean {
  const normalized = answer.trim().toLowerCase()
  return normalized === 'y' || normalized === 'yes'
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

process.on('SIGINT', () => {
  if (signalCleanedUp) return
  signalCleanedUp = true
  try {
    process.stdin.setRawMode?.(false)
  } catch {
    // Terminal may already be closed.
  }
  console.error('\nInterrupted by user; cleaning up temporary files...')
  closeReadline()
  cleanupTempRoot(tempRoot).finally(() => process.exit(130))
})

process.on('exit', () => {
  try {
    process.stdin.setRawMode?.(false)
  } catch {
    // Terminal may already be closed.
  }
  if (!tempRoot) return
  try {
    rmSync(tempRoot, { recursive: true, force: true })
  } catch {
    // Cleanup is best-effort; async cleanup also runs in the main finally.
  }
  tempRoot = undefined
})

main().catch((error) => {
  if (error instanceof RestoreError) {
    console.error(`\nError: ${error.message}`)
  } else {
    console.error(`\nUnexpected error: ${error instanceof Error ? error.stack : String(error)}`)
  }
  process.exitCode = 1
})

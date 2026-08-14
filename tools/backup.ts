#!/usr/bin/env bun
/**
 * PicHaus backup wizard.
 *
 * Usage:
 *   bun run tools/backup.ts                 interactive guided wizard
 *   bun run tools/backup.ts --yes           accept all defaults non-interactively
 *   bun run tools/backup.ts --yes --output /path/to/backups
 *   bun run tools/backup.ts --yes --encrypt --passphrase-file ./backup-pass.txt
 *   bun run tools/backup.ts --help          show this help and exit
 *
 * Non-interactive flags:
 *   --yes                 accept every wizard default
 *   --output <dir>        backup output directory (default: <repo>/backups)
 *   --encrypt             gpg-symmetric AES256 encrypt the final archive
 *   --passphrase-file <f> read the encryption passphrase from a file; implies
 *                         --encrypt
 *   --storage-volume <v>  archive this Docker named volume instead of a local
 *                         storage directory
 *   --no-env              do not include .env in the backup (wizard default is
 *                         to include it)
 *   --help                show this help and exit
 *
 * The archive is written as:
 *   <output>/pichaus-backup-YYYYMMDD-HHmmss.tar.gz[.gpg]
 * with dump.pg, storage.tar, optional env.backup, and manifest.json at the
 * archive root. See tools/lib/backup.ts for the manifest schema.
 */

import { createInterface } from 'node:readline/promises'
import process from 'node:process'

import {
  BackupError,
  type CliOptions,
  formatBytes,
  maskDatabaseUrl,
  preflight,
  resolveOutputDir,
  runBackup,
} from './lib/backup.ts'

const stepsTotal = 6
let currentStep = 0

function step(description: string): void {
  currentStep += 1
  console.log(`\n[${currentStep}/${stepsTotal}] ${description}`)
}

function fail(message: string): never {
  console.error(`\nError: ${message}`)
  process.exitCode = 1
  throw new BackupError(message)
}

async function main(): Promise<void> {
  const cli = parseCliArgs(process.argv.slice(2))

  console.log('PicHaus backup')
  console.log(
    'Creates a self-contained archive of the database, uploaded files, and optionally .env.',
  )
  console.log(
    'Docker users: you can run this from the host against the published DB port; uploads in a named volume are archived automatically.',
  )

  step('Checking environment...')
  const pre = await preflight(
    process.cwd(),
    undefined,
    undefined,
    cli.storageVolume,
    cli.yes ? undefined : resolveDockerVolume,
  )
  console.log(`  Repo root:     ${pre.repoRoot}`)
  console.log(`  Database:      ${maskDatabaseUrl(pre.databaseUrl)}`)
  if (pre.storageSource.kind === 'local') {
    console.log(`  Storage:       ${pre.storageDir}`)
  } else {
    console.log(`  Storage:       Docker volume ${pre.storageSource.volumeName}`)
  }
  console.log(`  Storage driver: ${pre.storageDriver}`)
  console.log(`  PostgreSQL:    ${pre.postgresVersion}`)

  step('Gathering backup options...')
  const options = cli.yes ? await defaultsFromCli(cli, pre) : await runWizard(cli, pre)
  const outputDir = resolveOutputDir(pre.repoRoot, options.outputDir)
  console.log(`  Output directory: ${outputDir}`)
  console.log(`  Storage directory: ${options.storageDir}`)
  console.log(`  Include .env:      ${options.includeEnv ? 'yes (contains secrets)' : 'no'}`)
  console.log(`  Encrypt archive:   ${options.encrypt ? 'yes (gpg AES256)' : 'no'}`)

  if (!cli.yes) {
    const confirm = await ask(
      `Start backup with the settings above? [Y/n] `,
      'y',
    )
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      fail('Backup cancelled by user.')
    }
  }

  step('Executing backup...')
  console.log(`  Dumping PostgreSQL database and copying ${options.storageDir}...`)
  const result = await runBackup({
    ...options,
    repoRoot: pre.repoRoot,
    outputDir,
    databaseUrl: options.databaseUrl,
    storageDir: options.storageDir,
    storageSource: pre.storageSource,
    storageDriver: pre.storageDriver,
    postgresVersion: pre.postgresVersion,
  })

  step('Packaging archive...')
  console.log(`  Archive: ${result.archivePath}`)

  if (options.encrypt) {
    step('Encrypting archive (gpg AES256)...')
    console.log(`  Encrypted archive written to ${result.archivePath}`)
  } else {
    step('Finalizing archive...')
    console.log('  No encryption requested.')
  }

  step('Done')
  console.log()
  console.log(`Backup created: ${result.archivePath}`)
  console.log(`Size: ${formatBytes(result.archiveSize)} (${result.archiveSize} bytes)`)
  console.log(`SHA-256: ${result.archiveChecksum}`)
  console.log(`Contents: ${result.contents.join(', ')}`)
  console.log(`Photos in database: ${result.manifest.counts.photos}`)
  console.log(`Files in storage: ${result.manifest.counts.files}`)
  console.log()
  console.log('Restore hint: bun run tools/restore.ts <archive>')
}

async function resolveDockerVolume(choices: DockerVolumeChoice[]): Promise<string> {
  console.log()
  if (choices.length === 1) {
    const choice = choices[0]
    const answer = await ask(
      `Storage appears to be a Docker named volume. Archive "${choice.volumeName}" via a throwaway container? [Y/n]: `,
      'y',
    )
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      fail('Backup cancelled: no Docker volume selected.')
    }
    return choice.volumeName
  }

  console.log('Likely Docker upload volumes:')
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice.volumeName}${choice.autoDetected ? '' : ' (upload match)'}`)
  })
  const answer = await ask('Select a volume by number, or enter a different volume name: ', '1')
  const numeric = Number.parseInt(answer, 10)
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= choices.length) {
    return choices[numeric - 1].volumeName
  }
  return answer.trim()
}

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    yes: false,
    output: undefined,
    encrypt: false,
    passphraseFile: undefined,
    includeEnv: undefined,
    storageVolume: undefined,
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    } else if (arg === '--yes') {
      options.yes = true
    } else if (arg === '--no-env') {
      options.includeEnv = false
    } else if (arg === '--encrypt') {
      options.encrypt = true
    } else if (arg === '--output' || arg === '--passphrase-file' || arg === '--storage-volume') {
      const value = args[i + 1]
      if (!value || value.startsWith('--')) {
        fail(`${arg} requires a value.`)
      }
      if (arg === '--output') options.output = value
      else if (arg === '--passphrase-file') options.passphraseFile = value
      else options.storageVolume = value
      i += 1
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length)
    } else if (arg.startsWith('--passphrase-file=')) {
      options.passphraseFile = arg.slice('--passphrase-file='.length)
    } else if (arg.startsWith('--storage-volume=')) {
      options.storageVolume = arg.slice('--storage-volume='.length)
    } else {
      fail(`Unknown argument: ${arg}`)
    }
  }
  if (options.passphraseFile && !options.encrypt) {
    options.encrypt = true
  }
  return options
}

function printUsage(): void {
  console.log(
    [
      'PicHaus backup',
      '',
      'Usage: bun run tools/backup.ts [options]',
      '',
      'Options:',
      '  --yes                 accept every wizard default (non-interactive)',
      '  --output <dir>        backup output directory (default: <repo>/backups)',
      '  --encrypt             gpg-symmetric AES256 encrypt the final archive',
      '  --passphrase-file <f> read the encryption passphrase from a file; implies --encrypt',
      '  --storage-volume <v>  archive this Docker named volume instead of a local storage directory',
      '  --no-env              do not include .env in the backup (wizard default is to include it)',
      '  --help                show this help',
    ].join('\n'),
  )
}

async function defaultsFromCli(cli: CliOptions, pre: Awaited<ReturnType<typeof preflight>>) {
  const passphrase = cli.passphraseFile ? await readPassphraseFile(cli.passphraseFile) : undefined
  if (cli.encrypt && !passphrase) {
    fail('--encrypt requires --passphrase-file in non-interactive mode.')
  }
  return {
    outputDir: cli.output ?? './backups',
    databaseUrl: pre.databaseUrl,
    storageDir: pre.storageDir,
    includeEnv: cli.includeEnv ?? true,
    encrypt: cli.encrypt,
    passphrase,
  }
}

async function runWizard(cli: CliOptions, pre: Awaited<ReturnType<typeof preflight>>) {
  const outputDir = await ask(
    `Output directory for the backup archive [./backups]: `,
    cli.output ?? './backups',
  )
  const databaseUrl = await ask(
    `Database connection string [${maskDatabaseUrl(pre.databaseUrl)}]: `,
    pre.databaseUrl,
  )
  const storageDir = await ask(
    `Storage directory [${pre.storageDir}]: `,
    pre.storageDir,
  )

  let includeEnv = cli.includeEnv ?? true
  if (cli.includeEnv === undefined) {
    console.log('  Note: .env contains secrets such as DATABASE_URL and AUTH_SECRET.')
    const includeAnswer = await ask('Include .env in the backup? [Y/n]: ', 'y')
    includeEnv = !(includeAnswer.toLowerCase() === 'n' || includeAnswer.toLowerCase() === 'no')
  }

  let encrypt = cli.encrypt
  let passphrase: string | undefined
  if (cli.passphraseFile) {
    encrypt = true
    passphrase = await readPassphraseFile(cli.passphraseFile)
  } else if (!cli.encrypt) {
    const encryptAnswer = await ask('Encrypt the final archive with a passphrase (gpg symmetric AES256)? [y/N]: ', 'n')
    encrypt = encryptAnswer.toLowerCase() === 'y' || encryptAnswer.toLowerCase() === 'yes'
  }
  if (encrypt && passphrase === undefined) {
    while (true) {
      const first = await askMasked('Enter encryption passphrase (min 8 characters): ', undefined)
      if (first && first.length >= 8) {
        const second = await askMasked('Repeat encryption passphrase: ', undefined)
        if (second === first) {
          passphrase = first
          break
        }
        console.log('  Passphrases do not match; try again.')
      } else {
        console.log('  Passphrase must be at least 8 characters; try again.')
      }
    }
  }

  return {
    outputDir,
    databaseUrl,
    storageDir,
    includeEnv,
    encrypt,
    passphrase,
  }
}

async function readPassphraseFile(filePath: string): Promise<string> {
  try {
    const { readFile } = await import('node:fs/promises')
    const contents = (await readFile(filePath, 'utf8')).replace(/\r?\n$/, '')
    if (contents.length < 8) {
      fail(`Passphrase in ${filePath} is shorter than 8 characters.`)
    }
    return contents
  } catch (error) {
    fail(`Could not read passphrase file ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

let rl: ReturnType<typeof createInterface> | undefined

async function ask(prompt: string, defaultValue: string): Promise<string> {
  if (!rl) rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(prompt)
  const trimmed = answer.trim()
  return trimmed.length > 0 ? trimmed : defaultValue
}

/**
 * Reads a single line without echoing it back to the terminal. The prompt is
 * printed directly; the readline interface suppresses output while collecting
 * the answer.
 */
async function askMasked(prompt: string, defaultValue: string | undefined): Promise<string | undefined> {
  if (rl) {
    rl.close()
    rl = undefined
  }
  const hiddenRl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })
  // Suppress character echo while still reading a full line in raw mode.
  hiddenRl._writeToOutput = () => {}
  process.stdout.write(prompt)
  try {
    const answer = await hiddenRl.question('')
    process.stdout.write('\n')
    const trimmed = answer.trim()
    if (trimmed.length === 0) return defaultValue
    return trimmed
  } finally {
    hiddenRl.close()
    rl = createInterface({ input: process.stdin, output: process.stdout })
  }
}

main().catch((error) => {
  if (!(error instanceof BackupError)) {
    console.error(`\nUnexpected error: ${error instanceof Error ? error.stack : String(error)}`)
  }
  process.exitCode = 1
})

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { createReadStream } from 'node:fs'
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import type { Readable } from 'node:stream'

export const manifestToolName = 'pichaus-backup'

export class RestoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RestoreError'
  }
}

export interface Manifest {
  tool?: unknown
  version?: unknown
  createdAt?: unknown
  appVersion?: unknown
  gitSha?: unknown
  postgresVersion?: unknown
  storageDriver?: unknown
  counts?: {
    photos?: unknown
    files?: unknown
  }
  sizes?: Record<string, unknown>
  sha256?: Record<string, unknown>
  [key: string]: unknown
}

export interface PreflightResult {
  archivePath: string
  pgRestorePath: string
  psqlPath: string
  tarPath: string
  gpgPath: string | undefined
}

export interface ExtractedArchive {
  plainArchivePath: string
  stagingDir: string
  dumpPath: string
  storageTarPath: string
  envBackupPath: string | undefined
  manifest: Manifest
}

export interface EnvSnapshot {
  source: 'archive' | 'local' | 'none'
  filePath: string | undefined
  raw: string | undefined
  databaseUrl: string | undefined
  storageDir: string | undefined
  storageDriver: string | undefined
  values: Record<string, string>
}

export type StorageTarget =
  | { type: 'local'; dir: string }
  | { type: 'docker'; volume: string }

export interface RestorePlan {
  repoRoot: string
  databaseUrl: string
  storageTarget: StorageTarget
  extracted: ExtractedArchive
  envSnapshot: EnvSnapshot
  writeEnv: boolean
  webauthnRpId: string | undefined
  webauthnOrigin: string | undefined
  envBackupName: string | undefined
}

export interface DbTable {
  name: string
  count: number
}

export interface SafetyGate {
  database: {
    hasTables: boolean
    tables: DbTable[]
  }
  storage: {
    nonEmpty: boolean
    entries: string[]
  }
}

export interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  expected: string | undefined
  actual: string
}

export interface HealthResult {
  ok: boolean
  checks: HealthCheck[]
}

export function nowTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`,
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`,
  ].join('-')
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return `${bytes}`
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value >= 100 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`
}

export function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.username = parsed.username || 'postgres'
    parsed.password = '****'
    return parsed.toString().replace(/\/$/, '')
  } catch {
    const match = url.match(/^(postgres(?:ql)?:\/\/)([^:]+):[^@]*@/)
    if (match) return `${match[1]}${match[2]}:****@<redacted>`
    return '<redacted>'
  }
}

export function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

export async function preflight(archivePath: string): Promise<PreflightResult> {
  const resolvedArchive = path.resolve(archivePath)
  const archiveStat = await stat(resolvedArchive).catch(() => null)
  if (!archiveStat?.isFile()) {
    throw new RestoreError(`Archive not found: ${archivePath}`)
  }

  const pgRestorePath = await findOnPath('pg_restore')
  const psqlPath = await findOnPath('psql')
  const tarPath = await findOnPath('tar')
  if (!pgRestorePath || !psqlPath) {
    throw new RestoreError(
      'pg_restore and psql were not found on PATH. Install PostgreSQL client tools ' +
        '(macOS: brew install libpq; Debian/Ubuntu: sudo apt install postgresql-client), ' +
        'then make sure pg_restore and psql are on PATH and try again.',
    )
  }
  if (!tarPath) {
    throw new RestoreError('tar was not found on PATH. Install a standard tar utility and try again.')
  }

  const gpgPath = isEncryptedArchive(resolvedArchive)
    ? await findOnPath('gpg')
    : undefined
  if (isEncryptedArchive(resolvedArchive) && !gpgPath) {
    throw new RestoreError(
      'This archive is gpg-encrypted but gpg was not found on PATH. Install GnuPG and try again.',
    )
  }

  return {
    archivePath: resolvedArchive,
    pgRestorePath,
    psqlPath,
    tarPath,
    gpgPath,
  }
}

export function isEncryptedArchive(archivePath: string): boolean {
  return path.basename(archivePath).toLowerCase().endsWith('.gpg')
}

export async function createTempRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'pichaus-restore-'))
}

export async function cleanupTempRoot(tempRoot: string | undefined): Promise<void> {
  if (!tempRoot) return
  await rm(tempRoot, { recursive: true, force: true }).catch(() => {})
}

export async function decryptArchive(
  archivePath: string,
  tempRoot: string,
  passphrase: string,
): Promise<string> {
  const output = path.join(tempRoot, 'archive.tar.gz')
  try {
    await runCommand(
      'gpg',
      ['--batch', '--yes', '--decrypt', '--passphrase-fd', '0', '--output', output, archivePath],
      {
        input: `${passphrase}\n`,
        timeoutMs: 120_000,
        label: 'gpg decrypt',
      },
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    if (/bad session key|decryption failed|invalid (passphrase|session key)/i.test(detail)) {
      throw new RestoreError(
        `Could not decrypt the archive: wrong passphrase. Try again or re-create the backup.`,
      )
    }
    throw error
  }
  return output
}

export async function extractArchive(
  plainArchivePath: string,
  tempRoot: string,
): Promise<ExtractedArchive> {
  const stagingDir = await mkdtemp(path.join(tempRoot, 'staging-'))
  const gzip = await isGzipFile(plainArchivePath)
  const args = gzip
    ? ['-xzf', plainArchivePath, '-C', stagingDir]
    : ['-xf', plainArchivePath, '-C', stagingDir]
  await runCommand('tar', args, {
    label: 'extract archive',
    timeoutMs: undefined,
  })

  const manifestPath = path.join(stagingDir, 'manifest.json')
  if (!(await fileExists(manifestPath))) {
    throw new RestoreError(
      'manifest.json was not found at the archive root. This does not look like a PicHaus backup archive.',
    )
  }
  const manifest = await readManifest(manifestPath)

  const dumpPath = path.join(stagingDir, 'dump.pg')
  const storageTarPath = path.join(stagingDir, 'storage.tar')
  if (!(await fileExists(dumpPath))) {
    throw new RestoreError('dump.pg was not found at the archive root.')
  }
  if (!(await fileExists(storageTarPath))) {
    throw new RestoreError('storage.tar was not found at the archive root.')
  }

  const envBackupPath = path.join(stagingDir, 'env.backup')
  return {
    plainArchivePath,
    stagingDir,
    dumpPath,
    storageTarPath,
    envBackupPath: (await fileExists(envBackupPath)) ? envBackupPath : undefined,
    manifest,
  }
}

export async function verifyChecksums(stagingDir: string, manifest: Manifest): Promise<void> {
  const sha256 = manifest.sha256
  if (!sha256 || typeof sha256 !== 'object' || Object.keys(sha256).length === 0) {
    throw new RestoreError(
      'manifest.sha256 is missing or empty. Cannot verify the archive; refusing to restore.',
    )
  }

  for (const [name, expectedValue] of Object.entries(sha256)) {
    if (
      typeof name !== 'string' ||
      name.length === 0 ||
      name.includes('/') ||
      name.includes('\\') ||
      name.includes('..')
    ) {
      throw new RestoreError(`Invalid file name in manifest.sha256: ${name}`)
    }
    if (typeof expectedValue !== 'string' || !/^[a-f0-9]{64}$/i.test(expectedValue)) {
      throw new RestoreError(`Invalid sha256 value in manifest for ${name}`)
    }

    const filePath = path.join(stagingDir, name)
    const actual = await sha256File(filePath).catch(() => undefined)
    if (!actual) {
      throw new RestoreError(`manifest.sha256 lists ${name} but the file is missing from the archive.`)
    }
    if (actual.toLowerCase() !== expectedValue.toLowerCase()) {
      throw new RestoreError(
        `Checksum mismatch for ${name}: expected ${expectedValue.toLowerCase()}, got ${actual}. ` +
          `The archive is corrupt or was modified; do not restore it.`,
      )
    }
  }
}

export async function loadEnvSnapshot(
  repoRoot: string,
  envBackupPath: string | undefined,
): Promise<EnvSnapshot> {
  if (envBackupPath) {
    const raw = await readFile(envBackupPath, 'utf8')
    const values = parseEnvFile(raw)
    return {
      source: 'archive',
      filePath: envBackupPath,
      raw,
      databaseUrl: values.DATABASE_URL,
      storageDir: values.STORAGE_DIR,
      storageDriver: values.STORAGE_DRIVER,
      values,
    }
  }

  const localPath = path.join(repoRoot, '.env')
  try {
    const raw = await readFile(localPath, 'utf8')
    const values = parseEnvFile(raw)
    return {
      source: 'local',
      filePath: localPath,
      raw,
      databaseUrl: values.DATABASE_URL,
      storageDir: values.STORAGE_DIR,
      storageDriver: values.STORAGE_DRIVER,
      values,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        source: 'none',
        filePath: undefined,
        raw: undefined,
        databaseUrl: undefined,
        storageDir: undefined,
        storageDriver: undefined,
        values: {},
      }
    }
    throw error
  }
}

export function resolveLocalStorageDir(repoRoot: string, storageDir: string): string {
  return path.isAbsolute(storageDir) ? path.normalize(storageDir) : path.resolve(repoRoot, storageDir)
}

export async function isWritableDirectory(dir: string): Promise<boolean> {
  try {
    await access(dir, constants.W_OK)
    return true
  } catch {
    // The directory may not exist yet; check the nearest existing parent.
  }
  let current = path.resolve(dir)
  while (true) {
    const parent = path.dirname(current)
    if (parent === current) return false
    try {
      await access(parent, constants.W_OK)
      return true
    } catch {
      current = parent
    }
  }
}

export async function listDockerVolumes(): Promise<string[]> {
  await ensureDockerAvailable()
  const result = await runCommand(
    'docker',
    ['volume', 'ls', '--format', '{{.Name}}'],
    {
      label: 'list docker volumes',
      timeoutMs: 30_000,
    },
  )
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function suggestDockerVolumes(volumes: string[]): string[] {
  const needle = /pichaus|pic|upload|storage|media|data|photo/i
  return volumes.filter((name) => needle.test(name))
}

export async function ensureDockerAvailable(): Promise<void> {
  const dockerPath = await findOnPath('docker')
  if (!dockerPath) {
    throw new RestoreError(
      'Docker was requested but docker was not found on PATH. Install Docker and try again.',
    )
  }
}

export async function checkTargetDatabase(databaseUrl: string): Promise<SafetyGate['database']> {
  await connectToDatabase(databaseUrl)
  const tables: DbTable[] = []
  for (const tableName of ['photos', 'users']) {
    const result = await runCommand(
      'psql',
      ['-t', '-A', '-c', `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`, databaseUrl],
      {
        env: envFor(databaseUrl),
        label: `table check ${tableName}`,
        timeoutMs: 30_000,
      },
    )
    if (result.stdout.trim()) {
      const count = await countTableRows(databaseUrl, tableName)
      tables.push({ name: tableName, count })
    }
  }
  return { hasTables: tables.length > 0, tables }
}

export async function checkStorageTarget(storageTarget: StorageTarget): Promise<SafetyGate['storage']> {
  if (storageTarget.type === 'local') {
    let entries: string[] = []
    try {
      entries = await readdir(storageTarget.dir)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return { nonEmpty: entries.length > 0, entries: entries.slice(0, 12) }
  }

  await ensureDockerAvailable()
  try {
    await runCommand(
      'docker',
      ['volume', 'inspect', storageTarget.volume],
      {
        label: 'inspect docker volume',
        timeoutMs: 30_000,
      },
    )
  } catch {
    return { nonEmpty: false, entries: [] }
  }
  const result = await runCommand(
    'docker',
    ['run', '--rm', '-v', `${storageTarget.volume}:/data`, 'alpine', 'ls', '-A', '/data'],
    {
      label: 'inspect docker storage volume',
      timeoutMs: 120_000,
    },
  )
  const entries = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return { nonEmpty: entries.length > 0, entries: entries.slice(0, 12) }
}

export async function executeRestore(plan: RestorePlan): Promise<void> {
  const { extracted, databaseUrl } = plan
  const stripLevel = await storageTarStripLevel(extracted.storageTarPath)

  console.log('  Restoring PostgreSQL dump with pg_restore --clean...')
  try {
    await runCommand(
      'pg_restore',
      ['--clean', '--if-exists', '--no-owner', '--dbname', databaseUrl, extracted.dumpPath],
      {
        env: envFor(databaseUrl),
        timeoutMs: undefined,
        label: 'pg_restore',
      },
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new RestoreError(`Database restore failed. No storage or .env changes were made.\n${detail}`)
  }

  if (plan.storageTarget.type === 'local') {
    console.log(`  Restoring storage into ${plan.storageTarget.dir}...`)
    try {
      await clearDirectory(plan.storageTarget.dir)
      await mkdir(plan.storageTarget.dir, { recursive: true })
      const args = ['-xf', extracted.storageTarPath, '-C', plan.storageTarget.dir]
      if (stripLevel > 0) args.push('--strip-components=1')
      await runCommand('tar', args, {
        label: 'storage restore',
        timeoutMs: undefined,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const stripArg = stripLevel > 0 ? ' --strip-components=1' : ''
      throw new RestoreError(
        `Database restore completed, but storage restore to ${plan.storageTarget.dir} failed. ` +
          `The storage directory may be partially replaced; finish it manually with: ` +
          `mkdir -p ${plan.storageTarget.dir} && tar -xf ${extracted.storageTarPath} -C ${plan.storageTarget.dir}${stripArg}\n${detail}`,
      )
    }
  } else {
    console.log(`  Restoring storage into Docker volume ${plan.storageTarget.volume}...`)
    try {
      await ensureDockerAvailable()
      await clearDockerVolume(plan.storageTarget.volume)
      await runTarIntoDocker(plan.storageTarget.volume, extracted.storageTarPath, stripLevel)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new RestoreError(
        `Database restore completed, but storage restore into Docker volume ${plan.storageTarget.volume} failed. ` +
          `The volume may be partially replaced; finish it manually by extracting storage.tar into the volume.\n${detail}`,
      )
    }
  }

  if (plan.writeEnv) {
    const raw = plan.envSnapshot.raw
    if (!raw) {
      throw new RestoreError(
        `Database and storage restored, but .env restore was skipped: no .env source was available. ` +
          `Write .env manually with DATABASE_URL=${maskDatabaseUrl(plan.databaseUrl)}.`,
      )
    }
    console.log('  Writing patched .env...')
    try {
      const envPath = path.join(plan.repoRoot, '.env')
      const backupName = `.env.pre-restore-${nowTimestamp()}`
      if (await fileExists(envPath)) {
        await copyFile(envPath, path.join(plan.repoRoot, backupName))
        plan.envBackupName = backupName
      }
      const patched = patchEnvContents(
        raw,
        plan.databaseUrl,
        plan.webauthnRpId,
        plan.webauthnOrigin,
      )
      await writeFile(envPath, patched, { mode: 0o600 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new RestoreError(
        `Database and storage restored, but .env write failed. Remaining: write .env manually. ` +
          `A previous .env was preserved when possible.\n${detail}`,
      )
    }
  }
}

export async function runHealthCheck(plan: RestorePlan): Promise<HealthResult> {
  const checks: HealthCheck[] = []
  const expectedPhotos = numberOrUndefined(plan.extracted.manifest.counts?.photos)
  const expectedFiles = numberOrUndefined(plan.extracted.manifest.counts?.files)

  const counts = await queryTableCounts(plan.databaseUrl)
  for (const tableName of ['users', 'albums', 'photos', 'share_links']) {
    const actual = counts.get(tableName)
    if (actual === undefined) {
      checks.push({
        name: `${tableName} row count`,
        status: 'fail',
        expected: undefined,
        actual: 'table missing',
      })
      continue
    }
    let status: HealthCheck['status'] = 'pass'
    if (tableName === 'photos' && expectedPhotos !== undefined && actual !== expectedPhotos) {
      status = 'fail'
    }
    checks.push({
      name: `${tableName} row count`,
      status,
      expected: tableName === 'photos' && expectedPhotos !== undefined ? `${expectedPhotos}` : undefined,
      actual: `${actual}`,
    })
  }

  const fileCount =
    plan.storageTarget.type === 'local'
      ? await countFiles(plan.storageTarget.dir)
      : await countDockerFiles(plan.storageTarget.volume)
  if (expectedFiles !== undefined && fileCount !== expectedFiles) {
    checks.push({
      name: 'storage file count',
      status: 'fail',
      expected: `${expectedFiles}`,
      actual: `${fileCount}`,
    })
  } else {
    checks.push({
      name: 'storage file count',
      status: expectedFiles === undefined ? 'warn' : 'pass',
      expected: expectedFiles === undefined ? undefined : `${expectedFiles}`,
      actual: `${fileCount}`,
    })
  }

  const samplePaths = await queryPhotoSample(plan.databaseUrl, 3)
  if (samplePaths.length === 0) {
    checks.push({
      name: 'sample photo files on disk',
      status: 'pass',
      expected: undefined,
      actual: 'no photos to sample',
    })
  } else {
    let found = 0
    for (const storagePath of samplePaths) {
      if (await photoFileExists(plan.storageTarget, storagePath)) found += 1
    }
    checks.push({
      name: 'sample photo files on disk',
      status: found === samplePaths.length ? 'pass' : 'fail',
      expected: `${samplePaths.length}/${samplePaths.length}`,
      actual: `${found}/${samplePaths.length}`,
    })
  }

  return {
    ok: checks.every((check) => check.status !== 'fail'),
    checks,
  }
}

export function patchEnvContents(
  raw: string,
  databaseUrl: string,
  webauthnRpId: string | undefined,
  webauthnOrigin: string | undefined,
): string {
  const replacements = new Map<string, string>([['DATABASE_URL', databaseUrl]])
  if (webauthnRpId) replacements.set('WEBAUTHN_RP_ID', webauthnRpId)
  if (webauthnOrigin) replacements.set('WEBAUTHN_ORIGIN', webauthnOrigin)

  const seen = new Set<string>()
  const lines = raw.split(/\r?\n/).map((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    const eq = trimmed.indexOf('=')
    if (eq <= 0) return line
    const key = trimmed.slice(0, eq).trim()
    if (!replacements.has(key)) return line
    seen.add(key)
    return `${key}="${escapeEnvValue(replacements.get(key)!)}"`
  })
  for (const [key, value] of replacements) {
    if (!seen.has(key)) {
      lines.push(`${key}="${escapeEnvValue(value)}"`)
    }
  }
  return `${lines.join('\n')}\n`
}

export function hostFromDatabaseUrl(databaseUrl: string): string | undefined {
  try {
    return new URL(databaseUrl).hostname || undefined
  } catch {
    return undefined
  }
}

export function webauthnDefaults(
  databaseUrl: string,
  existingOrigin: string | undefined,
): { rpId: string; origin: string } {
  const host = hostFromDatabaseUrl(databaseUrl) ?? 'localhost'
  let origin: string | undefined
  if (existingOrigin) {
    try {
      const parsed = new URL(existingOrigin)
      const port = parsed.port ? `:${parsed.port}` : ''
      origin = `${parsed.protocol}//${host}${port}`
    } catch {
      origin = undefined
    }
  }
  return {
    rpId: host,
    origin: origin ?? `http://${host}:3000`,
  }
}

async function readManifest(manifestPath: string): Promise<Manifest> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    throw new RestoreError(`manifest.json is not valid JSON: ${errorMessage(error)}`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RestoreError('manifest.json must contain a JSON object.')
  }
  const manifest = parsed as Manifest
  if (manifest.tool !== undefined && manifest.tool !== manifestToolName) {
    throw new RestoreError(
      `manifest.tool is "${String(manifest.tool)}", expected "${manifestToolName}". ` +
        `This archive was not created by the PicHaus backup tool.`,
    )
  }
  if (!manifest.sha256 || typeof manifest.sha256 !== 'object' || Object.keys(manifest.sha256).length === 0) {
    throw new RestoreError(
      'manifest.sha256 is missing or empty. Cannot verify the archive; refusing to restore.',
    )
  }
  return manifest
}

async function isGzipFile(filePath: string): Promise<boolean> {
  const handle = await open(filePath, 'r')
  try {
    const buffer = Buffer.alloc(3)
    await handle.read(buffer, 0, 3, 0)
    return buffer[0] === 0x1f && buffer[1] === 0x8b
  } finally {
    await handle.close()
  }
}

async function connectToDatabase(databaseUrl: string): Promise<void> {
  try {
    await runCommand('psql', ['-t', '-A', '-c', 'SELECT 1', databaseUrl], {
      env: envFor(databaseUrl),
      label: 'database connectivity check',
      timeoutMs: 30_000,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const dbName = databaseNameFromUrl(databaseUrl)
    throw new RestoreError(
      `Could not connect to the target database${dbName ? ` "${dbName}"` : ''}: ${detail}` +
        (dbName
          ? `\nCreate it first, for example: createdb ${dbName} ` +
            `(or: docker exec <postgres-container> createdb -U <user> ${dbName})`
          : ''),
    )
  }
}

async function countTableRows(databaseUrl: string, tableName: string): Promise<number> {
  const result = await runCommand(
    'psql',
    ['-t', '-A', '-c', `SELECT count(*) FROM "${tableName}"`, databaseUrl],
    {
      env: envFor(databaseUrl),
      label: `count ${tableName}`,
      timeoutMs: 30_000,
    },
  )
  const count = Number.parseInt(result.stdout.trim(), 10)
  if (!Number.isFinite(count)) {
    throw new RestoreError(`Unexpected count output for ${tableName}: ${result.stdout.trim()}`)
  }
  return count
}

async function queryTableCounts(databaseUrl: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const tableName of ['users', 'albums', 'photos', 'share_links']) {
    try {
      counts.set(tableName, await countTableRows(databaseUrl, tableName))
    } catch {
      counts.delete(tableName)
    }
  }
  return counts
}

async function queryPhotoSample(databaseUrl: string, limit: number): Promise<string[]> {
  try {
    const result = await runCommand(
      'psql',
      ['-t', '-A', '-c', `SELECT "storagePath" FROM photos ORDER BY random() LIMIT ${limit}`, databaseUrl],
      {
        env: envFor(databaseUrl),
        label: 'sample photo paths',
        timeoutMs: 30_000,
      },
    )
    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

async function photoFileExists(storageTarget: StorageTarget, storagePath: string): Promise<boolean> {
  if (storageTarget.type === 'local') {
    return fileExists(path.join(storageTarget.dir, storagePath))
  }
  try {
    await runCommand(
      'docker',
      ['run', '--rm', '-v', `${storageTarget.volume}:/data`, 'alpine', 'test', '-f', `/data/${storagePath}`],
      {
        label: 'photo file check in docker volume',
        timeoutMs: 30_000,
      },
    )
    return true
  } catch {
    return false
  }
}

export async function storageTarStripLevel(storageTarPath: string): Promise<number> {
  const entries = await readFirstTarEntries(storageTarPath, 8)
  if (entries.length === 0) return 0
  const allStoragePrefixed = entries.every(
    (entry) => entry === 'storage' || entry.startsWith('storage/'),
  )
  return allStoragePrefixed ? 1 : 0
}

function readFirstTarEntries(filePath: string, maxLines: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('tar', ['-tf', filePath])
    const lines: string[] = []
    let buffer = ''
    let finished = false
    let settled = false

    const settle = (result: string[] | RestoreError) => {
      if (settled) return
      settled = true
      if (result instanceof RestoreError) reject(result)
      else resolve(result)
    }

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const parts = buffer.split('\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        if (!part) continue
        lines.push(part)
        if (lines.length >= maxLines) {
          finished = true
          child.kill('SIGTERM')
          settle(lines)
          return
        }
      }
    })
    child.on('error', (error) => {
      settle(new RestoreError(`Could not inspect storage.tar: ${errorMessage(error)}`))
    })
    child.on('close', (code) => {
      if (finished) return
      if (code === 0) settle(lines)
      else settle(new RestoreError(`Could not inspect storage.tar: tar exited with code ${code}`))
    })
  })
}

async function clearDirectory(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}

async function clearDockerVolume(volume: string): Promise<void> {
  await runCommand(
    'docker',
    [
      'run',
      '--rm',
      '-v',
      `${volume}:/data`,
      'alpine',
      'sh',
      '-c',
      'find /data -mindepth 1 -delete',
    ],
    {
      label: 'clear docker storage volume',
      timeoutMs: 120_000,
    },
  )
}

async function runTarIntoDocker(volume: string, tarPath: string, stripLevel: number): Promise<void> {
  const command =
    stripLevel > 0 ? 'tar -xf - -C /data --strip-components=1' : 'tar -xf - -C /data'
  const input = createReadStream(tarPath)
  await runCommand(
    'docker',
    ['run', '--rm', '-i', '-v', `${volume}:/data`, 'alpine', 'sh', '-c', command],
    {
      inputStream: input,
      label: 'restore storage into docker volume',
      timeoutMs: undefined,
    },
  )
}

async function countDockerFiles(volume: string): Promise<number> {
  const result = await runCommand(
    'docker',
    ['run', '--rm', '-v', `${volume}:/data`, 'alpine', 'find', '/data', '-type', 'f'],
    {
      label: 'count docker storage files',
      timeoutMs: 120_000,
    },
  )
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length
}

async function countFiles(directory: string): Promise<number> {
  let count = 0
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += await countFiles(path.join(directory, entry.name))
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      count += 1
    }
  }
  return count
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on('data', (chunk: Buffer) => hash.update(chunk))
    stream.on('end', () => resolve())
    stream.on('error', reject)
  })
  return hash.digest('hex')
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

async function findOnPath(command: string): Promise<string | undefined> {
  const pathDirs = (process.env.PATH ?? '').split(path.delimiter)
  for (const dir of pathDirs) {
    if (!dir) continue
    const candidate = path.join(dir, command)
    try {
      const fileStat = await stat(candidate)
      if (fileStat.isFile()) return candidate
    } catch {
      // Keep looking.
    }
  }
  return undefined
}

function envFor(databaseUrl: string): NodeJS.ProcessEnv {
  const env = { ...process.env }
  try {
    const password = new URL(databaseUrl).password
    if (password) env.PGPASSWORD = decodeURIComponent(password)
  } catch {
    // A malformed URL will be reported by psql with a clearer message.
  }
  return env
}

function databaseNameFromUrl(databaseUrl: string): string | undefined {
  try {
    const name = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, '').split('/')[0] ?? '')
    return name || undefined
  } catch {
    return undefined
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

function escapeEnvValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

interface RunCommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  input?: string
  inputStream?: Readable
  timeoutMs?: number
  label: string
}

async function runCommand(
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timeoutMs = options.timeoutMs ?? 60_000
    const timer =
      timeoutMs === undefined
        ? null
        : setTimeout(() => {
            child.kill('SIGTERM')
            settle(
              new RestoreError(
                `${options.label} timed out after ${Math.round(timeoutMs / 1000)}s and was killed.`,
              ),
            )
          }, timeoutMs)

    child.on('error', (error) => {
      settle(new RestoreError(`Failed to start ${options.label}: ${errorMessage(error)}`))
    })
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer)
      if (code === 0) {
        settle({ stdout, stderr })
        return
      }
      const detail = signal ? ` (signal ${signal})` : ` (exit ${code})`
      const stderrTail = stderr.trim().split('\n').slice(-8).join('\n')
      settle(
        new RestoreError(
          `${options.label} failed${detail}${stderrTail ? `:\n${stderrTail}` : ''}`,
        ),
      )
    })

    function settle(result: { stdout: string; stderr: string } | RestoreError) {
      if (settled) return
      settled = true
      if (result instanceof RestoreError) reject(result)
      else resolve(result)
    }

    if (options.inputStream) {
      options.inputStream.on('error', (error) => {
        settle(new RestoreError(`${options.label} input stream failed: ${errorMessage(error)}`))
      })
      options.inputStream.pipe(child.stdin)
    } else {
      if (options.input !== undefined) child.stdin.write(options.input)
      child.stdin.end()
    }
  })
}

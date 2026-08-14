import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cp as fsCp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
} from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { writeFile as nodeWriteFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

/**
 * PicHaus backup support library.
 *
 * All child processes are spawned with node:child_process and files are
 * handled with node:fs so the backup tool can also run under plain Node.js
 * inside the production Docker image.
 *
 * Archive layout (files at the archive root):
 *   dump.pg        - PostgreSQL dump in pg_dump custom format
 *   storage.tar    - plain tar of the storage directory (not gzipped; the
 *                    outer archive already compresses it)
 *   env.backup     - copy of the repo .env, only when the user opts in
 *   manifest.json  - machine-readable backup metadata (schema below)
 *
 * manifest.json schema:
 * {
 *   "tool": "pichaus-backup",
 *   "version": 1,
 *   "createdAt": "2026-08-14T12:00:00.000Z",
 *   "appVersion": "1.2.3",
 *   "gitSha": "2c87f58...",
 *   "postgresVersion": "18.4",
 *   "storageDriver": "local",
 *   "counts": { "photos": 123, "files": 1370 },
 *   "sizes": { "dump.pg": 1024, "storage.tar": 2048, "env.backup": 512 },
 *   "sha256": {
 *     "dump.pg": "<hex>",
 *     "storage.tar": "<hex>",
 *     "env.backup": "<hex>"
 *   }
 * }
 *
 * The checksums are computed against the staged files. Restore should verify
 * the files extracted from the archive against these hashes before loading
 * them, then restore dump.pg with pg_restore and unpack storage.tar.
 */

export const toolName = 'pichaus-backup'
export const manifestVersion = 1
export const backupTimestampFormat = 'YYYYMMDD-HHmmss'

export interface BackupOptions {
  repoRoot: string
  outputDir: string
  databaseUrl: string
  storageDir: string
  storageDriver: string
  includeEnv: boolean
  encrypt: boolean
  passphrase?: string
  postgresVersion: string
}

export interface Manifest {
  tool: typeof toolName
  version: number
  createdAt: string
  appVersion: string
  gitSha: string | null
  postgresVersion: string
  storageDriver: string
  counts: {
    photos: number
    files: number
  }
  sizes: Record<string, number>
  sha256: Record<string, string>
}

export interface ArchiveResult {
  archivePath: string
  plainArchivePath: string
  archiveChecksum: string
  archiveSize: number
  manifest: Manifest
  contents: string[]
}

export interface EnvSnapshot {
  databaseUrl: string | undefined
  storageDriver: string | undefined
  storageDir: string | undefined
  values: Record<string, string>
}

export interface PreflightResult {
  repoRoot: string
  env: EnvSnapshot
  databaseUrl: string
  storageDriver: string
  storageDir: string
  storageSource: StorageSource
  postgresVersion: string
  pgDumpPath: string
}

export interface StorageSource {
  kind: 'local' | 'docker-volume'
  localDir?: string
  volumeName?: string
}

export interface DockerVolumeChoice {
  volumeName: string
  autoDetected: boolean
}

export interface CliOptions {
  yes: boolean
  output: string | undefined
  encrypt: boolean
  passphraseFile: string | undefined
  includeEnv: boolean | undefined
  storageVolume: string | undefined
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
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

/**
 * Simple KEY=VALUE .env parser. Handles optional single/double quotes and
 * # comments. Values are kept as-is otherwise; this is deliberately not a
 * full shell parser because the file is controlled by the app operator.
 */
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

export async function readEnvFile(repoRoot: string): Promise<EnvSnapshot> {
  const envPath = path.join(repoRoot, '.env')
  try {
    const contents = await readFile(envPath, 'utf8')
    const values = parseEnvFile(contents)
    return {
      databaseUrl: values.DATABASE_URL,
      storageDriver: values.STORAGE_DRIVER,
      storageDir: values.STORAGE_DIR,
      values,
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') {
      throw new BackupError(`No .env file found at ${envPath}`)
    }
    throw new BackupError(`Could not read ${envPath}: ${errorMessage(error)}`)
  }
}

export async function findRepoRoot(start = process.cwd()): Promise<string> {
  let current = path.resolve(start)
  while (true) {
    const pkgPath = path.join(current, 'package.json')
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as { name?: string }
      if (pkg.name === 'PicHaus') return current
    } catch {
      // Continue walking up when package.json is absent or unreadable.
    }
    const parent = path.dirname(current)
    if (parent === current) {
      throw new BackupError(
        'Could not find the PicHaus repo root: no package.json with name "PicHaus" in this directory or its parents. Run this tool from the repo root.',
      )
    }
    current = parent
  }
}

export async function preflight(
  repoRoot: string,
  cliDatabaseUrl: string | undefined,
  cliStorageDir: string | undefined,
  cliStorageVolume: string | undefined,
  resolveDockerVolume?: (choices: DockerVolumeChoice[]) => Promise<string>,
): Promise<PreflightResult> {
  const env = await readEnvFile(repoRoot)

  const pgDumpPath = await findOnPath('pg_dump')
  if (!pgDumpPath) {
    throw new BackupError(
      'pg_dump was not found on PATH. Install PostgreSQL client tools with `brew install libpq` and try again.',
    )
  }

  const databaseUrl = cliDatabaseUrl ?? env.databaseUrl ?? process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new BackupError(
      'DATABASE_URL is not set in .env. Add it to .env (or pass --database) and try again.',
    )
  }

  const storageDriver = (env.storageDriver ?? process.env.STORAGE_DRIVER ?? 'local').toLowerCase()
  if (storageDriver !== 'local') {
    throw new BackupError(
      `STORAGE_DRIVER is "${storageDriver}". Only the "local" storage driver is supported by this backup tool yet.`,
    )
  }

  const storageDir = resolveStorageDir(
    repoRoot,
    cliStorageDir ?? env.storageDir ?? process.env.STORAGE_DIR ?? 'storage/uploads',
  )
  const storageStat = await stat(storageDir).catch(() => null)
  if (!storageStat?.isDirectory()) {
    const dockerAvailable = await commandExists('docker')
    if (!dockerAvailable) {
      throw new BackupError(
        `Storage directory does not exist: ${storageDir}. If uploads live in a Docker named volume, install the docker CLI so this tool can archive it.`,
      )
    }
    const volumeName =
      cliStorageVolume ??
      (resolveDockerVolume ? await resolveDockerVolume(await listDockerVolumes(storageDir)) : undefined)
    if (!volumeName) {
      const available = await listDockerVolumes(storageDir)
      if (available.length === 0) {
        throw new BackupError(
          `Storage directory does not exist (${storageDir}) and no likely Docker upload volume was found. Run \`docker volume ls\` and pass the volume name manually when prompted.`,
        )
      }
      throw new BackupError(
        `Storage directory does not exist (${storageDir}), but likely Docker volumes were found: ${available.map((v) => v.volumeName).join(', ')}. Run the interactive wizard or pass --storage-volume.`,
      )
    }
    return {
      repoRoot,
      env,
      databaseUrl,
      storageDriver,
      storageDir,
      storageSource: { kind: 'docker-volume', volumeName },
      postgresVersion,
      pgDumpPath,
    }
  }

  await verifyDatabaseConnection(databaseUrl)
  const postgresVersion = await getPostgresVersion(databaseUrl)

  return {
    repoRoot,
    env,
    databaseUrl,
    storageDriver,
    storageDir,
    storageSource: { kind: 'local', localDir: storageDir },
    postgresVersion,
    pgDumpPath,
  }
}

export async function listDockerVolumes(storageDir: string): Promise<DockerVolumeChoice[]> {
  const clues = [
    ...new Set(
      storageDir
        .split(/[\\/]/)
        .filter(Boolean)
        .map((part) => part.toLowerCase()),
    ),
  ]
  try {
    const result = await runCommand('docker', ['volume', 'ls', '--format', '{{.Name}}'], {
      timeoutMs: 15_000,
      label: 'docker volume ls',
    })
    const names = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const match = (name: string) => {
      const lower = name.toLowerCase()
      return clues.some((clue) => lower.includes(clue))
    }
    return names
      .filter((name) => match(name) || name.toLowerCase().includes('upload'))
      .map((name) => ({ volumeName: name, autoDetected: match(name) }))
  } catch {
    return []
  }
}

export async function commandExists(command: string): Promise<boolean> {
  return (await findOnPath(command)) !== null
}

export async function listComposeProjects(): Promise<string[]> {
  try {
    const result = await runCommand('docker', ['compose', 'ls', '--format', 'json'], {
      timeoutMs: 15_000,
      label: 'docker compose ls',
    })
    const projects: Array<{ Name?: string }> = JSON.parse(result.stdout)
    return projects.map((project) => project.Name ?? '').filter(Boolean)
  } catch {
    return []
  }
}

export function resolveStorageDir(repoRoot: string, storageDir: string): string {
  return path.isAbsolute(storageDir) ? path.normalize(storageDir) : path.resolve(repoRoot, storageDir)
}

export function resolveOutputDir(repoRoot: string, outputDir: string): string {
  return path.isAbsolute(outputDir) ? path.normalize(outputDir) : path.resolve(repoRoot, outputDir)
}

export async function runBackup(options: BackupOptions): Promise<ArchiveResult> {
  const {
    repoRoot,
    outputDir,
    databaseUrl,
    storageDir,
    storageDriver,
    includeEnv,
    encrypt,
    passphrase,
  } = options

  await mkdir(outputDir, { recursive: true })
  const stagingDir = await mkdtemp(path.join(outputDir, '.pichaus-backup-staging-'))
  const archiveBase = `pichaus-backup-${nowTimestamp()}`
  const plainArchivePath = path.join(outputDir, `${archiveBase}.tar.gz`)
  const finalArchivePath = encrypt
    ? path.join(outputDir, `${archiveBase}.tar.gz.gpg`)
    : plainArchivePath

  const partialFiles: string[] = []
  let manifest: Manifest | undefined

  const cleanupStaging = async () => {
    await rm(stagingDir, { recursive: true, force: true }).catch(() => {})
  }

  try {
    const stagedFiles: string[] = []

    await runCommand('pg_dump', ['--format=custom', '--file=dump.pg', databaseUrl], {
      cwd: stagingDir,
      env: envFor(databaseUrl),
      timeoutMs: undefined,
      label: 'pg_dump',
    })
    stagedFiles.push('dump.pg')

    const fileCount = await stageStorage(options.storageSource, options.storageDir, stagingDir)
    stagedFiles.push('storage.tar')

    if (includeEnv) {
      await fsCp(path.join(repoRoot, '.env'), path.join(stagingDir, 'env.backup'))
      stagedFiles.push('env.backup')
    }

    const [appVersion, gitSha] = await Promise.all([
      readAppVersion(repoRoot),
      readGitSha(repoRoot),
    ])
    const photoCount = await getPhotoCount(databaseUrl)

    const sizes: Record<string, number> = {}
    const sha256: Record<string, string> = {}
    for (const name of stagedFiles) {
      const filePath = path.join(stagingDir, name)
      const fileStat = await stat(filePath)
      sizes[name] = fileStat.size
      sha256[name] = await sha256File(filePath)
    }

    manifest = {
      tool: toolName,
      version: manifestVersion,
      createdAt: new Date().toISOString(),
      appVersion,
      gitSha,
      postgresVersion: options.postgresVersion,
      storageDriver,
      counts: {
        photos: photoCount,
        files: fileCount,
      },
      sizes,
      sha256,
    }
    const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`
    await nodeWriteFile(path.join(stagingDir, 'manifest.json'), manifestJson)

    await runCommand('tar', ['-czf', plainArchivePath, '-C', stagingDir, ...stagedFiles, 'manifest.json'], {
      timeoutMs: undefined,
      label: 'tar final archive',
    })
    partialFiles.push(plainArchivePath)

    let finalPath = plainArchivePath
    if (encrypt) {
      if (!passphrase) {
        throw new BackupError('Encryption was requested but no passphrase was provided.')
      }
      await runCommand('gpg', [
        '--batch',
        '--yes',
        '--symmetric',
        '--cipher-algo',
        'AES256',
        '--passphrase-fd',
        '0',
        '--output',
        finalArchivePath,
        plainArchivePath,
      ], {
        input: `${passphrase}\n`,
        timeoutMs: undefined,
        label: 'gpg encrypt',
      })
      partialFiles.push(finalArchivePath)
      await rm(plainArchivePath, { force: true }).catch(() => {})
      finalPath = finalArchivePath
    }

    const archiveStat = await stat(finalPath)
    return {
      archivePath: finalPath,
      plainArchivePath: encrypt ? plainArchivePath : finalPath,
      archiveChecksum: await sha256File(finalPath),
      archiveSize: archiveStat.size,
      manifest,
      contents: [...stagedFiles, 'manifest.json'],
    }
  } catch (error) {
    for (const file of partialFiles) {
      await rm(file, { force: true }).catch(() => {})
    }
    throw error
  } finally {
    await cleanupStaging()
  }
}

async function stageStorage(
  source: StorageSource,
  storageDir: string,
  stagingDir: string,
): Promise<number> {
  if (source.kind === 'docker-volume') {
    const volumeName = source.volumeName ?? ''
    if (!volumeName) throw new BackupError('Docker volume source selected but no volume name was provided.')
    await runCommand('docker', [
      'run',
      '--rm',
      '-v',
      `${volumeName}:/data:ro`,
      '-v',
      `${stagingDir}:/out`,
      'alpine',
      'tar',
      '-cf',
      '/out/storage.tar',
      '-C',
      '/data',
      '.',
    ], {
      timeoutMs: undefined,
      label: 'docker volume archive',
    })
    return await countFilesInTar(path.join(stagingDir, 'storage.tar'))
  }

  const storageDest = path.join(stagingDir, 'storage')
  await fsCp(storageDir, storageDest, { recursive: true, verbatimSymlinks: true })
  const fileCount = await countFiles(storageDest)
  await runCommand('tar', ['-cf', 'storage.tar', 'storage'], {
    cwd: stagingDir,
    timeoutMs: undefined,
    label: 'tar storage',
  })
  return fileCount
}

async function countFilesInTar(tarPath: string): Promise<number> {
  const result = await runCommand('tar', ['-tf', tarPath], {
    timeoutMs: 120_000,
    label: 'list storage archive',
  })
  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && !line.endsWith('/'))
    .length
}

interface RunCommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  input?: string
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
              new BackupError(
                `${options.label} timed out after ${Math.round(timeoutMs / 1000)}s and was killed.`,
              ),
            )
          }, timeoutMs)

    child.on('error', (error) => {
      settle(
        new BackupError(
          `Failed to start ${options.label}: ${errorMessage(error)}`,
        ),
      )
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
        new BackupError(
          `${options.label} failed${detail}${stderrTail ? `:\n${stderrTail}` : ''}`,
        ),
      )
    })

    function settle(result: { stdout: string; stderr: string } | BackupError) {
      if (settled) return
      settled = true
      if (result instanceof BackupError) reject(result)
      else resolve(result)
    }

    if (options.input !== undefined) {
      child.stdin.write(options.input)
    }
    child.stdin.end()
  })
}

function envFor(databaseUrl: string): NodeJS.ProcessEnv {
  const env = { ...process.env }
  const password = new URL(databaseUrl).password
  if (password) env.PGPASSWORD = decodeURIComponent(password)
  return env
}

async function verifyDatabaseConnection(databaseUrl: string): Promise<void> {
  await runCommand('psql', ['-t', '-A', '-c', 'SELECT 1', databaseUrl], {
    env: envFor(databaseUrl),
    timeoutMs: 15_000,
    label: 'database connectivity check',
  })
}

async function getPostgresVersion(databaseUrl: string): Promise<string> {
  const result = await runCommand('psql', ['-t', '-A', '-c', 'SHOW server_version', databaseUrl], {
    env: envFor(databaseUrl),
    timeoutMs: 60_000,
    label: 'postgres version check',
  })
  return result.stdout.trim()
}

async function getPhotoCount(databaseUrl: string): Promise<number> {
  const result = await runCommand('psql', ['-t', '-A', '-c', 'SELECT count(*) FROM photos', databaseUrl], {
    env: envFor(databaseUrl),
    timeoutMs: 60_000,
    label: 'photo count query',
  })
  const count = Number.parseInt(result.stdout.trim(), 10)
  if (!Number.isFinite(count)) {
    throw new BackupError(`Unexpected photo count output from psql: ${result.stdout.trim()}`)
  }
  return count
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

export async function readAppVersion(repoRoot: string): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8')) as {
      version?: string
    }
    if (pkg.version) return pkg.version
  } catch {
    // No package.json or unreadable version: fall through to git describe.
  }
  try {
    const result = await runCommand('git', ['describe', '--tags', '--always', '--dirty'], {
      cwd: repoRoot,
      timeoutMs: 10_000,
      label: 'git describe',
    })
    return result.stdout.trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

async function readGitSha(repoRoot: string): Promise<string | null> {
  try {
    const result = await runCommand('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      timeoutMs: 10_000,
      label: 'git rev-parse',
    })
    return result.stdout.trim() || null
  } catch {
    return null
  }
}

async function findOnPath(command: string): Promise<string | null> {
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
  return null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

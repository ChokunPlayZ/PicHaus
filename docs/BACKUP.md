# Backup and Restore

PicHaus ships with guided command-line tools for backing up and restoring a full instance. This runbook covers migrating an instance to a new machine, with Docker deployments first and a bare-metal path after.

## Table of Contents

1. [What a Backup Contains](#what-a-backup-contains)
2. [Prerequisites](#prerequisites)
3. [Backing Up a Docker Deployment](#backing-up-a-docker-deployment)
4. [Restoring into a Docker Deployment](#restoring-into-a-docker-deployment)
5. [Bare-Metal Backup and Restore](#bare-metal-backup-and-restore)
6. [Scheduling](#scheduling)
7. [Troubleshooting](#troubleshooting)

---

## What a Backup Contains

A backup is a single `.tar.gz` archive, or `.tar.gz.gpg` when encrypted, named `pichaus-backup-YYYYMMDD-HHmmss`. Inside the archive:

| File | Description |
|---|---|
| `dump.pg` | Full `pg_dump` custom-format dump of the database |
| `storage.tar` | Plain tar of the entire storage tree: `photos/`, `thumbnails/`, `avatars/`, and `logos/` |
| `env.backup` | Copy of `.env`, included only when you opt in |
| `manifest.json` | Metadata and per-file SHA-256 checksums: `appVersion`, `gitSha`, `postgresVersion`, counts, sizes |

> **Note**: `env.backup` contains secrets including `AUTH_SECRET`, `DATABASE_URL`, and any OAuth client secrets. Only include it if you are comfortable storing those credentials in the backup artifact. Encrypt the archive when it leaves the machine.

The backup tool currently supports the `local` storage driver only. If `STORAGE_DRIVER=s3`, create a backup from a machine that can read the local files (or restore the S3 bucket separately) until an S3 path is added.

## Prerequisites

The Docker image ships the backup/restore tools, PostgreSQL client 18 from the official PostgreSQL APT repository (PGDG), and GnuPG, so Docker deployments can run them with plain Node and no host dependencies. Running the tools on the host instead requires [Bun](https://bun.sh) and the PostgreSQL client tools where you run them:

- **macOS**: `brew install libpq`
- **Debian / Ubuntu**: `sudo apt install postgresql-client`

The backup tool needs `pg_dump` and `psql`; the restore tool needs `pg_restore`, `psql`, and `tar`. Restoring into a Docker volume (`--docker-volume`) additionally needs the `docker` CLI on the restore host. GPG is only required for encrypted archives.

After installing libpq on macOS, make sure the client binaries are on `PATH` (Homebrew installs them under the libpq keg, which is not linked by default):

```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"   # Apple Silicon
export PATH="/usr/local/opt/libpq/bin:$PATH"     # Intel Macs
```

The client tool major version must be **at least** the server's major version:

```bash
pg_dump --version
psql --version
```

For example, use `pg_dump`/`pg_restore` from PostgreSQL 16 or newer to back up and restore a PostgreSQL 16 database. [GPG](https://www.gnupg.org/) is only required when you choose encryption.

The image's `postgresql-client-18` can dump and restore any server up to PostgreSQL 18, including the compose default `postgres:16-alpine` and newer 17/18 servers.

The backup wizard reads `DATABASE_URL` and `STORAGE_DIR` from `.env` in the PicHaus repo (falling back to environment variables). A checkout of the repo is required, and the tool verifies the database connection and storage directory before starting.

---

## Backing Up a Docker Deployment

The production image ships the backup tools, PostgreSQL client 18, and GnuPG, so the recommended path is the included compose profile. Running the tool on the Docker **host** is still supported for operators who prefer a checkout outside the container.

### Compose profile (recommended)

One command writes a timestamped archive to `./backups` on the host:

```bash
docker compose \
  -f docker-compose.yml -f docker-compose.backup.yml \
  --profile backup run --rm backup
```

The `backup` service mounts `.env` and the `pichaus-storage` volume read-only, dumps the database through the `db` service, and runs with `--yes --output /backups --no-env` by default, so the archive contains `dump.pg` and `storage.tar` but no secrets. Pass extra arguments after `backup` to override that command; for example, to encrypt with a passphrase file placed under `./backups` (mounted at `/backups`):

```bash
docker compose \
  -f docker-compose.yml -f docker-compose.backup.yml \
  --profile backup run --rm backup \
  --yes --output /backups \
  --passphrase-file /backups/passphrase.txt \
  --no-env
```

For usage help:

```bash
docker compose \
  -f docker-compose.yml -f docker-compose.backup.yml \
  --profile backup run --rm backup --help
```

### Host runner (alternative)

1. On the Docker host, check out PicHaus and install dependencies:

```bash
git clone https://github.com/ChokunPlayZ/PicHaus.git
cd PicHaus
bun install
```

2. Make sure `.env` in that checkout points at the container database. The `db` service does not publish a port by default, so add a host-only mapping to `docker-compose.yml`:

```yaml
services:
  db:
    ports:
      - "127.0.0.1:5432:5432"
```

Then restart the database container (`docker compose up -d db`) and export the target, or set it in the checkout's `.env`:

```bash
export DATABASE_URL="postgresql://pichaus:pichaus@127.0.0.1:5432/pichaus"
export STORAGE_DIR="/srv/pichaus-backups/staging"
```

The wizard defaults to these values, and cron jobs need them exported the same way.

3. Make the uploads volume readable as a directory. The simplest reliable option is to copy the volume into a staging directory with a throwaway container:

```bash
mkdir -p /srv/pichaus-backups/staging
docker run --rm \
  -v pichaus-storage:/data:ro \
  -v /srv/pichaus-backups/staging:/staging \
  alpine sh -c 'cp -a /data/. /staging/'
```

`cp` preserves the internal layout (`photos/`, `thumbnails/`, `avatars/`, `logos/`), which is what the backup tool expects. If the volume is already bind-mounted on the host, point `STORAGE_DIR` at that host path instead and skip the copy.

4. Run the guided wizard:

```bash
cd /srv/PicHaus
bun run backup
```

```text
PicHaus backup
Creates a self-contained archive of the database, uploaded files, and optionally .env.

[1/6] Checking environment...
  Repo root:     /srv/PicHaus
  Database:      postgresql://pichaus:****@127.0.0.1:5432/pichaus
  Storage:       /srv/pichaus-backups/staging
  Storage driver: local
  PostgreSQL:    16.8

[2/6] Gathering backup options...
  Output directory for the backup archive [./backups]: /srv/pichaus-backups
  Database connection string [postgresql://...]: 
  Storage directory [/srv/pichaus-backups/staging]: 
  Note: .env contains secrets such as DATABASE_URL and AUTH_SECRET.
  Include .env in the backup? [Y/n]: n
  Encrypt the final archive with a passphrase (gpg symmetric AES256)? [y/N]: n
  Start backup with the settings above? [Y/n]: y

[3/6] Executing backup...
  Dumping PostgreSQL database and copying /srv/pichaus-backups/staging...

[4/6] Packaging archive...
  Archive: /srv/pichaus-backups/pichaus-backup-20260814-021700.tar.gz

[5/6] Finalizing archive...
  Verified 4 files in the archive.

[6/6] Done

Backup created: /srv/pichaus-backups/pichaus-backup-20260814-021700.tar.gz
Size: 1.2 GB (1284500000 bytes)
SHA-256: 4e11f9c8cafc...
Contents: dump.pg, storage.tar, manifest.json
Photos in database: 512
Files in storage: 1730

Restore hint: bun run tools/restore.ts <archive>
```

5. For cron or scripting, use the non-interactive flags:

```bash
bun run tools/backup.ts \
  --yes \
  --output /srv/pichaus-backups \
  --no-env
```

```bash
bun run tools/backup.ts \
  --yes \
  --output /srv/pichaus-backups \
  --encrypt \
  --passphrase-file /srv/pichaus-backups/.passphrase \
  --no-env
```

| Flag | Meaning |
|---|---|
| `--yes` | Accept every wizard default and skip all prompts |
| `--output <dir>` | Output directory (default: `<repo>/backups`; the archive name is generated with a timestamp) |
| `--no-env` | Do not include `.env` in the backup (wizard default is to include it) |
| `--encrypt` | Encrypt the final archive with GPG symmetric AES256 |
| `--passphrase-file <file>` | Read the encryption passphrase from a file; implies `--encrypt` |
| `--storage-volume <volume>` | Archive the named Docker volume instead of a local storage directory |
| `--help` | Show usage and exit |

`--encrypt` requires `--passphrase-file` in non-interactive mode.

> **Note**: Passwords are never stored in the archive. Keep the passphrase (or GPG key) somewhere safe and separate from the archives.

### In-container node variant

The image runs the tools with plain Node (Node 24 TypeScript type stripping), so `node /app/tools/...` is the in-container entrypoint; Bun is not installed. The compose profile above is the supported way to run them with the correct mounts, but ad hoc help or validation runs work without any mounts:

```bash
docker run --rm --entrypoint node pichaus-backup:local \
  /app/tools/backup.ts --help
```

For a real backup or restore, use the compose profile (`docker compose ... run --rm backup`), which mounts `.env`, the storage volume, and `./backups`; extra arguments after the service name override its default command.

---

## Restoring into a Docker Deployment

Restore on a fresh machine into a stack with an **empty** database and **empty** storage volume. The restore tool has native Docker support: `--docker-volume` restores `storage.tar` directly into a named volume, so no host staging copy is needed.

### Compose profile (recommended)

1. On the fresh machine, clone PicHaus, provide `.env`, and start the stack. The database and storage volumes start empty:

```bash
git clone https://github.com/ChokunPlayZ/PicHaus.git
cd PicHaus
# copy or create .env (DATABASE_URL, STORAGE_DRIVER, ...)
docker compose up -d
```

If you are re-testing on a machine that already has data, stop the stack and remove the local volumes first (this deletes everything in them):

```bash
docker compose down -v
docker compose up -d
```

2. Put the archive in `./backups` (mounted at `/backups`) and restore non-interactively:

```bash
docker compose \
  -f docker-compose.yml -f docker-compose.backup.yml \
  --profile backup run --rm restore \
  /backups/pichaus-backup-20260814-021700.tar.gz \
  --yes \
  --db-url "postgresql://pichaus:pichaus@db:5432/pichaus" \
  --storage-dir /app/storage \
  --no-env
```

The `restore` service mounts the `pichaus-storage` volume writable and writes `storage.tar` back into it, so no host staging copy is needed. `--no-env` skips `.env` writes; the restore service does not mount the host `.env`. Add `--passphrase-file /backups/passphrase.txt` for an encrypted archive. `--yes` requires the target database and storage to be empty; add `--overwrite` when re-testing against data that may remain.

For usage help:

```bash
docker compose \
  -f docker-compose.yml -f docker-compose.backup.yml \
  --profile backup run --rm restore --help
```

3. Start and verify with the steps at the end of this section.

### Host runner (alternative)

#### 1. Install prerequisites and clone

Install [Bun](https://bun.sh), the PostgreSQL client tools, and the `docker` CLI on the host, then clone the repository:

```bash
git clone https://github.com/ChokunPlayZ/PicHaus.git
cd PicHaus
bun install
```

Check `appVersion` and `gitSha` in the archive's `manifest.json` (`tar -xzf <archive> manifest.json`) and use the same or a newer version of PicHaus. Newer versions are safe because migrations run automatically on startup; older versions may not understand a newer dump.

#### 2. Start the stack with empty data

On a fresh machine the volumes start empty automatically. If you are re-testing, stop the stack and remove the local volumes first (this deletes everything in them):

```bash
docker compose down -v
docker compose up -d
```

Add the same `127.0.0.1:5432:5432` port mapping for `db` described in the backup section so the restore wizard on the host can reach the database.

#### 3. Run the restore wizard

The restore tool takes the archive path as its first argument:

```bash
bun run tools/restore.ts /srv/pichaus-backups/pichaus-backup-20260814-021700.tar.gz
```

```text
PicHaus restore
Restores a database, storage directory, and optional .env from a PicHaus backup archive.

[1/8] Preflight...
  Archive:    /srv/pichaus-backups/pichaus-backup-20260814-021700.tar.gz
  pg_restore: /usr/bin/pg_restore
  psql:       /usr/bin/psql
  tar:        /usr/bin/tar

[2/8] Preparing archive...
  Plain backup archive; no decryption needed.

[3/8] Extracting archive and reading manifest...
  Backup created:  2026-08-14T02:17:00.000Z
  App version:     1.2.3
  Git SHA:         2c87f58...
  PostgreSQL:      16.8
  Storage driver:  local
  Photos:          512
  Storage files:   1730

[4/8] Verifying checksums...
  All manifest checksums verified.

[5/8] Configuring restore target...
  Target DATABASE_URL [postgresql://...]:
  Target storage directory [/srv/PicHaus/storage/uploads]:
  Restore into a Docker named volume? [y/N]: y
  Detected Docker volumes:
    1) pichaus-storage
    2) pichaus-ml-cache
  Docker volume name [pichaus-storage]:
  Write a fresh .env from env.backup, patching DATABASE_URL? [Y/n]: n

Restore plan:
  Database:   postgresql://pichaus:****@127.0.0.1:5432/pichaus
  Storage:    Docker volume pichaus-storage
  Write .env: no

[6/8] Safety checks and final confirmation...
  Target database ... has no existing PicHaus tables.
  Target storage Docker volume pichaus-storage is empty or new.
  Proceed with restore? [Y/n]: y

[7/8] Executing restore...
  Restoring PostgreSQL dump with pg_restore --clean...
  Restoring storage into Docker volume pichaus-storage...

[8/8] Running health checks...
  PASS users row count: 3
  PASS albums row count: 12
  PASS photos row count: 512
  PASS share_links row count: 8
  PASS storage file count: 1730
  PASS sample photo files on disk: 3/3

Restore complete.
  Database: postgresql://pichaus:****@127.0.0.1:5432/pichaus
  Storage:  Docker volume pichaus-storage
  .env:     not written
```

Encrypted archives prompt for the decryption passphrase before extraction. If the archive contains `env.backup`, the wizard offers to write a fresh `.env` into the current repo checkout with `DATABASE_URL` patched to your target (the previous file, when present, is saved as `.env.pre-restore-<timestamp>`). Answer no, or pass `--no-env`, when you want to keep the host's existing `.env`.

For cron or scripting, the same restore can run non-interactively:

```bash
bun run tools/restore.ts /srv/pichaus-backups/pichaus-backup-20260814-021700.tar.gz \
  --yes \
  --db-url "postgresql://pichaus:pichaus@127.0.0.1:5432/pichaus" \
  --docker-volume pichaus-storage \
  --no-env
```

Add `--passphrase-file /path/to/passphrase` for an encrypted archive.

| Flag | Meaning |
|---|---|
| `--yes` | Accept every wizard default (non-interactive) |
| `--db-url <url>` | Target database connection string |
| `--storage-dir <dir>` | Target local storage directory |
| `--docker-volume <volume>` | Restore `storage.tar` into a Docker named volume |
| `--passphrase-file <file>` | Read the GPG decryption passphrase from a file |
| `--overwrite` | Skip the typed OVERWRITE safety gates |
| `--no-env` | Do not write a patched `.env` |
| `--dry-run` | Decrypt, extract, verify, and show the plan, then stop without changes |
| `--help` | Show usage and exit |

The wizard checks the target database and storage before touching anything. If the database already contains PicHaus tables or the target storage is not empty, it requires you to type `OVERWRITE` before proceeding. In `--yes` mode that gate fails unless `--overwrite` is also passed.

The image ships the same tool, so the compose profile at the top of this section is the supported container variant; it runs `node /app/tools/restore.ts` with the storage volume already mounted at `/app/storage`.

### Start and verify

Restart the stack after the restore:

```bash
docker compose restart pichaus
```

Then verify:

- Admin and user login works with existing passwords
- Album and photo pages load, and thumbnails/originals render from the restored volume
- OAuth buttons still redirect to the correct identity provider

### Domain changes (passkeys and OAuth)

Passkeys are bound to the domain they were registered on. If the new machine uses a different domain, existing passkeys will not authenticate there; users can still sign in with their password and re-register passkeys from **Settings**.

Update `.env` on the new host:

| Variable | Required after a domain change |
|---|---|
| `WEBAUTHN_RP_ID` | Set to the new bare domain (no protocol, no port) |
| `WEBAUTHN_ORIGIN` | Set to the new exact origin, including protocol and port |

The restore wizard offers to patch these values automatically when the archive's `env.backup` contains them. Also add the new origin to the authorized redirect URIs in your Google Cloud and Microsoft Entra ID OAuth console applications.

---

## Bare-Metal Backup and Restore

The same tools work without Docker.

### Backup

```bash
cd /path/to/PicHaus
bun run backup
```

The wizard defaults come from `.env` (`DATABASE_URL`, `STORAGE_DIR`). Non-interactive:

```bash
bun run tools/backup.ts --yes --output /srv/pichaus-backups --no-env
```

### Restore

1. Install Bun and the PostgreSQL client tools, clone PicHaus, and `bun install`
2. Create an empty database: `createdb pichaus`
3. Run the restore wizard with the archive path; use `--storage-dir` if storage lives somewhere other than the repo default
4. Start the app and verify login and photo loading

```bash
bun run tools/restore.ts /srv/pichaus-backups/pichaus-backup-20260814-021700.tar.gz
```

Non-interactive:

```bash
bun run tools/restore.ts /srv/pichaus-backups/pichaus-backup-20260814-021700.tar.gz \
  --yes \
  --db-url "postgresql://pichaus:secret@localhost:5432/pichaus" \
  --storage-dir /srv/pichaus/storage/uploads \
  --no-env
```

See the Docker restore section for the checksum verification, OVERWRITE gates, health check, and domain-change notes; they apply identically on bare metal.

---

## Scheduling

The backup command is fully non-interactive, so it fits in cron. Set `DATABASE_URL` and `STORAGE_DIR` in the crontab or a wrapper script:

```cron
# 2:17 AM daily; archives are timestamped, keep the last N yourself
17 2 * * * cd /srv/PicHaus && DATABASE_URL="postgresql://pichaus:pichaus@127.0.0.1:5432/pichaus" STORAGE_DIR="/srv/pichaus-backups/staging" bun run tools/backup.ts --yes --output /srv/pichaus-backups --no-env
```

Guidelines:

- Keep the last N archives (for example, 7 or 14) and delete older files with a small cleanup job
- Store at least one copy off-machine or on a different failure domain
- If archives are encrypted, make sure the restore host has the passphrase or GPG key available

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `pg_dump was not found on PATH` | PostgreSQL client tools are missing on the run host | `brew install libpq` (macOS) or `apt install postgresql-client` (Debian/Ubuntu); make the libpq `bin` directory visible to the tool |
| `pg_restore and psql were not found on PATH` | PostgreSQL client tools are missing on the restore host | Install the client tools as above; restore uses `pg_restore`, `psql`, and `tar` |
| `pg_dump: server version mismatch` | `pg_dump` is older than the server | Upgrade `pg_dump` so its major version is >= the server's major version |
| `No .env file found at ...` | The tool must be run from a PicHaus checkout | Run from the repo root, or point the tool at a checkout that contains `.env` |
| `Only the "local" storage driver is supported` | `STORAGE_DRIVER=s3` is set | Back up from a host with the local files (or restore the bucket separately); S3 backups are not supported yet |
| `gpg was not found on PATH` | GPG is missing but the archive is encrypted | Install GnuPG on the restore host, or use an unencrypted archive |
| Wrong passphrase / decryption failed | Passphrase does not match the one used during backup | Re-run with the correct passphrase; verify the passphrase file is the one used by `--encrypt`; interactive mode allows three attempts |
| Checksum mismatch | Archive was truncated or corrupted in transit | Re-download or re-copy the archive; never restore a corrupt archive |
| Refuses to restore because the database is not empty | Target DB already contains tables | In the wizard, type `OVERWRITE` when prompted; in `--yes` mode, pass `--overwrite`; or point the tool at a fresh empty database |
| Refuses to restore because storage is not empty | Target directory or Docker volume already contains files | Confirm the OVERWRITE gate (or pass `--overwrite` in `--yes` mode), or restore into an empty volume/directory |
| `Docker was requested but docker was not found on PATH` | `--docker-volume` requires the Docker CLI on the restore host | Install Docker CLI or use `--storage-dir` against a host-visible directory |
| `permission denied` while copying storage | Restore process cannot write the target storage directory | Ensure the user running the tool can write the target directory and that the parent exists |
| Restore completes but queries fail | Restored dump was created by a much newer PostgreSQL server | Use a PostgreSQL server major version equal to or newer than the source (or an identical major version), then re-restore |

---

> **Note**: Always test a restore on a scratch machine before you rely on it for a real migration. A backup you have never restored is not yet a backup.

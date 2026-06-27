# PicHaus

A self-hosted, collaborative photo album platform built for photography clubs. Photographers upload via a share link — no account required. Owners manage albums, cover photos, share links, and API access from a clean web UI.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Docker Deployment](#docker-deployment)
5. [Environment Variables](#environment-variables)
6. [First-Time Setup](#first-time-setup)
7. [User Guide](#user-guide)
   - [Albums](#albums)
   - [Photos](#photos)
   - [Share Links](#share-links)
   - [Share Groups](#share-groups)
   - [Favorites](#favorites)
   - [Guest Upload Flow](#guest-upload-flow)
   - [Statistics](#statistics)
   - [API Tokens](#api-tokens)
   - [Admin Panel](#admin-panel)
8. [External API Reference](#external-api-reference)
9. [Authentication](#authentication)
10. [Storage](#storage)
11. [Database](#database)

---

## Features

- **Collaborative albums** — invite collaborators or share an upload link; anyone with the link can upload without an account
- **EXIF metadata** — camera model, lens, focal length, ISO, aperture, shutter speed, date taken — extracted automatically on upload
- **Justified photo grid** — responsive masonry layout via Immich's WASM-accelerated justified-layout engine
- **Blurhash placeholders** — progressive image loading with smooth fade-in
- **Duplicate detection** — SHA-256 file hashing prevents uploading the same photo twice to the same album
- **Album cover cropper** — interactive 16:9 cropper with move, resize, rule-of-thirds guide, and live preview
- **Share links** — generate `view` or `upload` links per album, with optional password and expiry
- **Share groups** — bundle multiple albums under one share link
- **Instagram handles** — photographers can attach their Instagram username, shown on photos
- **Favorites** — mark photos as favorites while browsing a share link; selections persist per album context and survive page refresh
- **Statistics dashboard** — top cameras, lenses, aperture/ISO/shutter distributions, monthly activity timeline
- **Passkeys & security keys** — passwordless login via WebAuthn/FIDO2 (Face ID, Touch ID, Windows Hello, YubiKey, etc.)
- **External API** — scoped API tokens for integrating PicHaus with external sites or workflows
- **Fully self-hosted** — Docker image, PostgreSQL, local file storage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Nuxt 4](https://nuxt.com) (Vue 3, Nitro server) |
| Styling | [TailwindCSS](https://tailwindcss.com) + CSS custom properties |
| ORM / DB | [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL |
| Image processing | [Sharp](https://sharp.pixelplumbing.com) |
| EXIF parsing | [exifr](https://mutiny.cz/exifr/) |
| Blurhash | [blurhash](https://blurha.sh) |
| Photo layout | [@immich/justified-layout-wasm](https://github.com/immich-app/immich) |
| Password hashing | Argon2id |
| Passkeys / Security Keys | [@simplewebauthn/server](https://simplewebauthn.dev) + [@simplewebauthn/browser](https://simplewebauthn.dev) |
| Runtime | [Bun](https://bun.sh) |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- PostgreSQL 14+

```bash
# Clone and install
git clone https://github.com/ChokunPlayZ/PicHaus.git
cd PicHaus
bun install

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL and AUTH_SECRET

# Start development server
bun dev
```

The app runs at `http://localhost:3000`. Database migrations run automatically on startup. On first visit you are redirected to `/setup` to create the admin account.

---

## Docker Deployment

```bash
docker build -t pichaus .

docker run -d \
  --name pichaus \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/pichaus" \
  -e AUTH_SECRET="your-random-32-char-secret-here" \
  -e STORAGE_DIR="/data/uploads" \
  -v pichaus-storage:/data/uploads \
  pichaus
```

> **Note**: `DATABASE_URL` is only needed at runtime — the build step has no database dependency.

### docker-compose example

```yaml
services:
  pichaus:
    image: pichaus
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://pichaus:secret@db:5432/pichaus
      AUTH_SECRET: replace-with-32-plus-char-random-string
      STORAGE_DIR: /data/uploads
      MAX_FILE_SIZE_MB: "20"
    volumes:
      - uploads:/data/uploads
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pichaus
      POSTGRES_USER: pichaus
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  uploads:
  pgdata:
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `AUTH_SECRET` | Yes (prod) | dev fallback | HMAC secret for session tokens — minimum 32 characters |
| `STORAGE_DIR` | No | `storage/uploads` | Absolute or relative path where uploaded files are stored |
| `MAX_FILE_SIZE_MB` | No | `10` | Maximum upload size per file in megabytes |
| `NODE_ENV` | No | `development` | Set to `production` in production deployments |
| `WEBAUTHN_RP_ID` | No | `localhost` | Passkey relying-party ID — must match the domain users visit (no port, no protocol) |
| `WEBAUTHN_RP_NAME` | No | `PicHaus` | Human-readable relying-party name shown by the browser during passkey registration |
| `WEBAUTHN_ORIGIN` | No | `http://localhost:3000` | Exact origin in the browser address bar — must include protocol and port if non-standard |
| `GOOGLE_CLIENT_ID` | No | — | OAuth 2.0 client ID from Google Cloud Console — enables Google Sign-In when set |
| `GOOGLE_CLIENT_SECRET` | No | — | OAuth 2.0 client secret — required alongside `GOOGLE_CLIENT_ID` |

> **Security**: `AUTH_SECRET` must be a random string of at least 32 characters. In production the server will refuse to start without it.

> **Passkeys in production**: Set `WEBAUTHN_RP_ID` to your bare domain (e.g. `photos.example.com`), `WEBAUTHN_ORIGIN` to `https://photos.example.com`, and `WEBAUTHN_RP_NAME` to whatever label you want users to see in their authenticator. The three values must match exactly — mismatches cause silent passkey registration or login failures.

> **Google Sign-In**: Create an OAuth 2.0 credential in [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add your origin to the authorised JavaScript origins, and add `<origin>/api/v1/auth/google/callback` as an authorised redirect URI. Set both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable the feature — Google Sign-In is hidden from the UI when `GOOGLE_CLIENT_ID` is absent.

---

## First-Time Setup

1. Navigate to `http://your-host:3000` — you are automatically redirected to `/setup`
2. Enter a name, email address, and password (minimum 8 characters) for the admin account
3. Click **Complete Setup** — you are redirected to `/login`
4. Sign in with the credentials you just created

The setup endpoint is permanently disabled once the first account exists.

---

## User Guide

### Albums

Albums are the primary organisational unit. Each album has a title, optional description, optional event date, tags, visibility (public/private), and an optional cover photo.

**Creating an album**

1. Go to **Albums** → click **Create Album**
2. Fill in the title and optional fields
3. Upload photos directly after creation

**Album views**

- **Grid** — card layout with cover photo thumbnails
- **Timeline** — albums grouped by event date (month/year)

**Searching and filtering**

The album list supports:
- Full-text search across title, description, and owner name
- Tag search (text input or click a tag chip)
- Combined tag + text filters

**Album permissions**

| Role | Can view | Can upload | Can edit metadata | Can manage share links |
|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin collaborator | ✓ | ✓ | ✓ | — |
| Editor collaborator | ✓ | ✓ | — | — |
| Viewer (share link) | ✓ | — | — | — |
| Upload link user | ✓ | ✓ | — | — |

**Cover photo**

Open an album → click the cover area → select any photo → crop using the 16:9 cropper:
- Drag inside the selection to **move** it
- Drag the **corner handles** to resize (ratio is locked)
- Use the live preview to verify the result before saving

**Batch operations**

In an album, enter selection mode (checkbox icon or long-press on mobile) to:
- **Click** a photo to toggle it; **Shift+click** to range-select from the last touched photo
- **Cmd/Ctrl+click** to toggle an individual photo without clearing the selection
- Delete selected photos
- Download selected photos as a ZIP

---

### Photos

The **Photos** page shows every photo across all your albums in a single justified grid with infinite scroll.

**Filtering**

- Camera model
- Lens
- Start date (by date taken)

**Photo viewer**

Click any photo to open the full-screen viewer:
- Navigate with arrow keys or swipe
- View EXIF data (camera, lens, focal length, ISO, aperture, shutter speed)
- Download the original file
- Share via the native share sheet (mobile)
- Adjacent photos are preloaded for smooth navigation

**EXIF metadata**

On upload, the following fields are extracted automatically from the file:
`cameraModel`, `lens`, `focalLength`, `iso`, `aperture`, `shutterSpeed`, `dateTaken`

These can be manually edited from the photo context menu (right-click or long-press).

---

### Share Links

Every album can have multiple share links. Links are accessed at `/v/<token>`.

**Types**

| Type | Description |
|---|---|
| `view` | Read-only access — visitors can browse and download photos |
| `upload` | Visitors can upload photos to the album (creates a guest account) |

**Options**

- **Label** — a human-readable name for the link (e.g. "Club members")
- **Password** — optional; visitors must enter the password before accessing
- **Expiry date** — optional; link becomes invalid after this date
- **Show metadata** — toggle whether EXIF data is visible to share link visitors

**Managing links**

Go to **Share Links** in the sidebar to see all links across all albums, with view counts, type badges, and expiry status. Links can be edited (label, expiry, password, metadata visibility) or deleted from this page.

---

### Share Groups

A share group bundles multiple albums under a single share link. Visitors who access the group link see a gallery of all albums in the group and can open individual albums from there.

**Creating a share group**

From an album's share link dialog, choose **Create Share Group** and add multiple albums. A single token is generated for the whole group.

Group share links support the same password and expiry options as individual album links.

---

### Favorites

While browsing a share link (`/v/<token>`), visitors can mark photos as favorites. Favorites are:

- Toggled by clicking the heart/star icon on any photo
- Persisted in `localStorage` keyed by token and album, so they survive a page refresh
- Context-aware — switching between albums in a share group saves and restores each album's favorites separately
- Stored locally in the browser only (not synced to the server)

---

### Guest Upload Flow

This is designed for photography club events: the club owner creates an **upload** share link, distributes it to photographers, and photographers upload directly without creating an account.

**From the photographer's perspective**

1. Open the share link URL (`/v/<token>`) and click **Upload Photos**
2. If password-protected, enter the password
3. Enter a display name and optionally an email and Instagram handle
4. Drag and drop photos onto the upload zone, or click to browse — a full-page overlay activates when files are dragged over the window
5. A per-file thumbnail queue appears showing each file's status: pending → hashing → uploading → done / duplicate / error
6. An overall progress bar tracks the batch; a summary (N uploaded · N duplicates skipped · N failed) appears on completion
7. Click **Add more** to queue additional files, **Clear all** to reset, or **Upload More Photos** to start a new batch

**Account behaviour**

- **No email provided** → an anonymous guest account is created
- **New email** → a new account is created with that email
- **Existing email, no password** → authenticated as the existing guest account
- **Existing email with password** → must provide the account password to authenticate

Uploaded photos are credited to the photographer's account and their Instagram handle (if provided) is shown on their photos.

---

### Statistics

The Statistics page (`/statistics`) shows aggregated data across all your albums:

- **Total photos** and **total albums** counters
- **Storage used**
- **Top cameras** — bar chart of the 5 most-used camera models by shot count
- **Top lenses** — same for lens models
- **Technical stats** — frequency tables for aperture, ISO, shutter speed, focal length
- **Activity timeline** — line chart of photos uploaded per month

---

### API Tokens

API tokens allow external services (personal websites, scripts, integrations) to query your albums and photos via the [External API](#external-api-reference).

**Creating a token**

1. Go to **API Keys** in the sidebar
2. Enter a token name (e.g. "My Portfolio Site")
3. Select the scopes you need (`photos:read`, `albums:read`)
4. Click **Create Token** — copy the token immediately, it is shown only once

**Scopes**

| Scope | Access |
|---|---|
| `albums:read` | List albums, get album detail |
| `photos:read` | List photos in an album, get random photos |

Tokens can be revoked at any time from the API Keys page.

---

### Admin Panel

Accessible at `/admin/users` for accounts with the `ADMIN` role.

- View all registered users
- Promote a user to admin or demote to regular user
- Delete users

---

## External API Reference

All external endpoints require:
```
Authorization: Bearer <api_token>
```

Responses are JSON with a top-level `success: true` field. Timestamps are Unix seconds (integers).

---

### `GET /api/external/albums`

Scope: `albums:read`

List albums owned by the token owner.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page, max 100 (default: 20) |
| `q` | string | Full-text search on title and description |
| `tag` | string | Filter by a single tag (exact match) |
| `tags` | string | Comma-separated list — albums containing any of these tags |
| `visibility` | `all` \| `public` \| `private` | Default: `all` |
| `sortBy` | `createdAt` \| `updatedAt` \| `eventDate` \| `title` | Default: `createdAt` |
| `order` | `asc` \| `desc` | Default: `desc` |
| `fromEventDate` | Unix timestamp | Filter albums with eventDate ≥ value |
| `toEventDate` | Unix timestamp | Filter albums with eventDate ≤ value |

**Response**

```json
{
  "success": true,
  "data": {
    "albums": [
      {
        "id": "uuid",
        "title": "Spring Shoot 2025",
        "description": "...",
        "tags": ["portrait", "outdoor"],
        "eventDate": 1743465600,
        "isPublic": true,
        "photoCount": 42,
        "createdAt": 1743465600,
        "updatedAt": 1743465600,
        "coverPhoto": { "id": "uuid", "blurhash": "..." },
        "coverThumbUrl": "/api/assets/thumb/<id>",
        "coverFullUrl": "/api/assets/full/<id>"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "hasMore": false
    },
    "timeline": [
      { "year": 2025, "month": 4, "count": 3 }
    ]
  }
}
```

---

### `GET /api/external/albums/:id`

Scope: `albums:read`

Get full detail for a single album.

**Response**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Spring Shoot 2025",
    "description": "...",
    "tags": ["portrait"],
    "eventDate": 1743465600,
    "isPublic": true,
    "photoCount": 42,
    "collaboratorCount": 3,
    "createdAt": 1743465600,
    "updatedAt": 1743465600,
    "owner": { "id": "uuid", "name": "Alice", "instagram": "alice.photo" },
    "coverPhoto": { "id": "uuid", "blurhash": "..." },
    "coverThumbUrl": "/api/assets/thumb/<id>",
    "coverFullUrl": "/api/assets/full/<id>",
    "shareLinks": [
      { "id": "uuid", "token": "...", "type": "view", "views": 12 }
    ]
  }
}
```

---

### `GET /api/external/albums/:id/photos`

Scope: `photos:read`

List photos in an album with pagination.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Max 100 (default: 20) |
| `orientation` | `any` \| `landscape` \| `portrait` \| `square` | Default: `any` |
| `sortBy` | `createdAt` \| `dateTaken` \| `originalName` | Default: `createdAt` |
| `order` | `asc` \| `desc` | Default: `desc` |
| `fromDateTaken` | Unix timestamp | Filter photos taken on or after this date |
| `toDateTaken` | Unix timestamp | Filter photos taken on or before this date |

**Response**

```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "uuid",
        "filename": "...",
        "originalName": "DSC_0042.jpg",
        "width": 5472,
        "height": 3648,
        "blurhash": "LGF5?xYk^6#M@-5c,1J5@[or[Q6.",
        "mimeType": "image/jpeg",
        "size": 8192000,
        "dateTaken": 1743465600,
        "cameraModel": "Nikon D850",
        "lens": "NIKKOR 24-70mm f/2.8",
        "focalLength": "35.0mm",
        "iso": 400,
        "aperture": "f/2.8",
        "shutterSpeed": "1/500s",
        "thumbUrl": "/api/assets/thumb/<id>",
        "fullUrl": "/api/assets/full/<id>",
        "uploader": { "id": "uuid", "name": "Alice", "instagram": "alice.photo" }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "hasMore": true
    }
  }
}
```

---

### `GET /api/external/albums/:id/random`

Scope: `photos:read`

Get random photos from a specific album.

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `count` | integer | Number of photos to return (default: 1, max: 50) |
| `orientation` | `any` \| `landscape` \| `portrait` \| `square` | Default: `any` |
| `fromDateTaken` | Unix timestamp | Only include photos taken after this date |
| `toDateTaken` | Unix timestamp | Only include photos taken before this date |

---

### `GET /api/external/photos/random`

Scope: `photos:read`

Get random photos from across all albums (or a filtered subset).

**Query parameters**

| Parameter | Type | Description |
|---|---|---|
| `count` | integer | Number of photos (default: 1, max: 50) |
| `albumId` | UUID | Restrict to a single album |
| `tag` | string | Restrict to albums with this tag |
| `orientation` | `any` \| `landscape` \| `portrait` \| `square` | Default: `any` |
| `visibility` | `all` \| `public` \| `private` | Default: `all` |
| `fromDateTaken` | Unix timestamp | — |
| `toDateTaken` | Unix timestamp | — |

**Response** — same shape as the photo object in the albums/photos endpoint.

---

### Serving assets

Asset URLs returned by the API require an `Authorization` header **or** an `access_token` query parameter when the album is private.

```
GET /api/assets/thumb/<photo_id>     # WebP thumbnail (~400px)
GET /api/assets/full/<photo_id>      # Original file
```

For use in `<img>` tags, append `?access_token=<token>` since browsers cannot set custom headers:

```
/api/assets/full/<id>?access_token=<api_token>
```

---

## Authentication

PicHaus uses a custom HMAC-SHA256 token scheme rather than a JWT library.

**Format**: `base64url(payload) . HMAC-SHA256(payload, AUTH_SECRET)`

**Session tokens**

- Created on login (password or passkey), valid for 7 days
- Stored in `localStorage` under the key `pichaus_access_token`
- Sent as `Authorization: Bearer <token>` on every API call
- For image asset URLs, appended as `?access_token=<token>`

**Passkeys and security keys**

PicHaus supports WebAuthn/FIDO2 passkeys and hardware security keys (YubiKey, etc.) as a passwordless login method via [@simplewebauthn](https://simplewebauthn.dev).

- **Sign in** — the login page has a **Sign in with Passkey** button. The browser or OS prompts the user to select a registered credential. No email or password is entered.
- **Register a passkey** — go to **Settings** → **Passkeys & Security Keys** → click **Add**. The browser prompts to create a new credential using the platform authenticator (Face ID, Touch ID, Windows Hello) or a plugged-in hardware key. Multiple passkeys can be registered per account.
- **Manage passkeys** — each registered passkey is listed by name and transport (Built-in, USB, NFC, Bluetooth). Individual passkeys can be removed at any time.
- Passkey challenges expire after 5 minutes and are consumed on first use (replay-safe).
- Credentials are stored in the `passkeys` table as `credentialId`, `publicKey` (base64url), and a replay counter.

**API tokens**

- Prefixed `pk_` followed by 64 hex characters
- Stored as SHA-256 hashes in the database (never the raw token)
- Scoped: `photos:read` and/or `albums:read`
- Optional expiry; last-used timestamp updated asynchronously

**Password hashing**

All passwords (user accounts and share link passwords) are hashed with Argon2id:
- Memory cost: 19 MiB
- Time cost: 2 iterations
- Parallelism: 1

---

## Storage

Files are stored on the local filesystem at `STORAGE_DIR` (default `storage/uploads`).

**Directory layout**

```
storage/uploads/
├── photos/          # Original uploaded files + cover photos
└── thumbnails/      # WebP thumbnails (max 400×400)
```

**File naming**

`<first_16_chars_of_sha256>_<unix_ms>.<ext>`

Example: `a3f9c12d8e4b7f01_1743465600000.jpg`

**On upload**

1. MIME type verified by Sharp (not just the file extension)
2. SHA-256 hash computed for duplicate detection
3. EXIF data extracted
4. WebP thumbnail generated at ≤400×400
5. Blurhash generated at 32×32 for progressive loading
6. Both files written to disk, then the database record is created
7. If the database write fails, both files are deleted (no orphans)

Cover photos are processed to JPEG at up to 2560×2560 and stored alongside regular photos.

---

## Database

PicHaus uses PostgreSQL via [Drizzle ORM](https://orm.drizzle.team). All timestamps are stored as Unix seconds (`BigInt`).

**Auto-migration on startup**

Migrations run automatically every time the server starts — no manual steps required when upgrading. The runner (a Nitro server plugin) applies any pending SQL files from `drizzle/migrations/` before the first request is served. Migration SQL is bundled into the production build so the `.output` directory is fully self-contained.

On first boot after upgrading from a Prisma-managed database, the runner detects the existing schema and stamps the migrations as already applied without re-running them — your data is untouched.

**Key tables**

| Table | Description |
|---|---|
| `users` | Accounts — email, Argon2id password hash, name, Instagram, role |
| `albums` | Photo collection — title, description, tags, event date, visibility, cover photo |
| `photos` | Image file — storage paths, dimensions, blurhash, SHA-256 hash, full EXIF data |
| `share_links` | Token-based share link — type (view/upload), optional password + expiry |
| `share_groups` | Bundles multiple albums under one share link |
| `album_collaborators` | Per-album role assignment (viewer / editor / admin) |
| `api_tokens` | External API token — hashed, scoped, optional expiry |
| `passkeys` | WebAuthn/FIDO2 credentials for passwordless login |

**Schema changes**

Migration files live in `drizzle/migrations/`. To add a column or table:

1. Edit `server/db/schema.ts`
2. `bun run db:generate` — generates a new SQL migration file (requires `DATABASE_URL`)
3. Commit both the schema change and the generated SQL file
4. Deploy — the runner applies the new migration automatically on next boot

```bash
bun run db:generate   # generate migration SQL from schema changes
bun run db:migrate    # apply migrations manually (normally not needed)
bun run db:studio     # open Drizzle Studio to browse the database
```

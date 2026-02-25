# PicHaus

PicHaus is a photo storage and sharing platform.
Built by Photographer, for Photographers.

PicHaus is fully self-hosted and open source.

Built on a trusted Tech Stack
- Nuxt 4
- TailwindCSS
- Prisma
- Postgres

## Features
- Colabrative photo albums 
- Photo upload and sharing
- EXIF support (camera model, lens, focal-length, ISO, aperture, shutter-speed, time shot)
- Beautiful Album page.
- Responsive design
- Easy mobile download via share sheet.
- support opentelemetry for those data people.

## Great for University Photography Club
that's exactly why it is built.
the owner only have to share an upload link
other can upload without an account, just a link and password.
photographers can attatch their own IG account.

## Fully Self Hosted with Docker.

## Environment Setup
- Copy `.env.example` to `.env`
- Set `DATABASE_URL`
- Set `AUTH_SECRET` to a random secret (minimum 32 characters)
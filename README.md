# Mini Streaming Platform

Scalable full-stack starter for a subscription-based streaming platform built with `Next.js`, `NestJS`, `PostgreSQL`, `Redis`, a private HTTP storage server, Stripe, an FFmpeg worker for HLS processing, and a DRM/legal compliance layer.

## Apps

- `apps/web`: Next.js catalog, auth flows, player, account area, admin dashboard
- `apps/api`: NestJS API for auth, playback authorization, admin management, subscriptions, analytics
- `apps/api`: also includes license verification, ToS versioning, DMCA workflows, and access audit logging
- `apps/worker`: BullMQ worker for FFmpeg video transcoding and background jobs
- `packages/types`: shared enums and API contracts
- `packages/config`: shared constants and access helpers
- `infra/sql`: PostgreSQL schema and seed ideas
- `infra/docker`: local container setup

## Quick Start

1. Copy `.env.example` to `.env` and edit the values for your environment.
2. Start infrastructure with `docker compose -f infra/docker/docker-compose.yml up -d`.
3. Install dependencies with `pnpm install`.
4. Point `STORAGE_BASE_URL` to your private storage server.
5. Configure `STORAGE_AUTH_TYPE`, `STORAGE_SECRET`, and `STORAGE_PROXY_MODE`.
6. Start the apps with `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev:worker`.

See [infra/docker/DEPLOYMENT.md](D:\NetBeansProjects\webtruyen\webphim\infra\docker\DEPLOYMENT.md) for deployment details.
See [VIDEO_DISPLAY_AND_PLAYBACK.md](D:\NetBeansProjects\webtruyen\webphim\docs\VIDEO_DISPLAY_AND_PLAYBACK.md) for the full display, upload, storage, and playback flow.
See [SIMPLE_MINIO_STORAGE.md](D:\NetBeansProjects\webtruyen\webphim\docs\SIMPLE_MINIO_STORAGE.md) for the recommended simple MinIO setup.

## Non-Technical Setup

If this project is being installed by a new or non-technical user:

- Read [INSTALL_FOR_NEW_USER.md](D:\NetBeansProjects\webtruyen\webphim\INSTALL_FOR_NEW_USER.md)
- Double-click [RUN_PLATFORM.bat](D:\NetBeansProjects\webtruyen\webphim\RUN_PLATFORM.bat) to start the platform
- Double-click [STOP_PLATFORM.bat](D:\NetBeansProjects\webtruyen\webphim\STOP_PLATFORM.bat) to stop it

## Default Accounts

The API seeds built-in accounts for easy first login. You can change them in [.env](D:\NetBeansProjects\webtruyen\webphim\.env):

- Admin: `admin@streamvault.local` / `Admin@123456`
- Moderator: `moderator@streamvault.local` / `Admin@123456`
- User: `user@streamvault.local` / `Admin@123456`

The default admin account has full access to the admin area and user-management features.

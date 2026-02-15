# Quizier Monorepo

Nx monorepo scaffold for Quizier:

- `packages/server` — Fastify + TypeScript backend
- `packages/client` — React 19 + Vite + Tailwind frontend
- `packages/shared` — Shared TypeScript and Zod contracts

## Prerequisites

- Node.js 20+
- npm 9+
- Docker (for MongoDB)

## Setup

```bash
npm install
cp .env.example .env
```

## Run MongoDB

```bash
docker compose up -d
```

## Development

```bash
npm run dev:server
npm run dev:client
```

## Validation

```bash
npx nx run-many -t lint build test --all --outputStyle=static
```

## Current Scaffold Targets

- `server:dev` (tsx watch)
- `server:seed` (placeholder seed script)
- `client:dev` (vite)
- `shared:build` (tsc declarations)

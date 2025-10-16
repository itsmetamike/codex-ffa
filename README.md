# LLM Content Strategy Workbench

This project bootstraps a Next.js 14 application that orchestrates a multi-agent
workflow for transforming marketer briefs into brand-aware content strategies.

## Getting Started

1. Install dependencies: `pnpm install`
2. Apply the Prisma schema: `pnpm db:push`
3. Run the development server: `pnpm dev`

Set the following environment variables (see `.env.example` for defaults):

- `DATABASE_URL` – SQLite connection string.
- `OPENAI_API_KEY` – API key used by the OpenAI SDK.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui primitives
- Prisma ORM with SQLite
- OpenAI SDK wrapper for model access
- Vitest for lightweight schema validation tests

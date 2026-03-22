# AGENTS.md

## Cursor Cloud specific instructions

### Overview

AppReady (branded "Luminetic") is a single Next.js 16 (App Router) application that helps iOS developers prepare for App Store submission. It uses a multi-model AI pipeline (Google Gemini 2.5 Pro + Claude via AWS Bedrock) for analysis, AWS Cognito for auth, DynamoDB for storage, and Square for payments.

### Running the app

- `npm run dev` starts the Next.js dev server on port 3000 (Turbopack).
- A `.env.local` file is needed for environment variables. Copy values from `.env.production` for non-secret config (Cognito pool/client IDs, DynamoDB table, S3 bucket). These are safe public identifiers.
- All API routes require Cognito JWT authentication. Without valid AWS credentials configured, API calls will fail or redirect to `/login`. The UI pages themselves render fine without AWS credentials.

### Lint, test, build

- **Lint:** `npm run lint` — ESLint 9 with `eslint-config-next`. Note: there are pre-existing lint errors in `src/app/(auth)/pricing/page.tsx` (react-hooks/immutability for `window.location.href` assignments) and unused-variable warnings in a few files.
- **Test:** `npm test` — Vitest 4 with 61 tests. There are 4 pre-existing test failures (mock setup issues in login route tests, a stale price assertion in square config test, and an error message leaking in checkout test). These are not caused by environment setup.
- **Build:** `npm run build` — standard Next.js production build.

### External dependencies

All backend functionality requires AWS credentials (Bedrock, Cognito, DynamoDB, S3, Secrets Manager). Without them, the frontend renders correctly but API calls fail. There are no local database or Docker dependencies — the app is designed to run against managed AWS services.

### Key paths

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components
- `src/lib/` — Shared utilities (auth, DB, AI analysis, Square payments)
- `vitest.config.ts` — Test configuration
- `amplify.yml` — AWS Amplify deployment spec

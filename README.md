# AppReady

**Make App Store submission less painful by helping developers submit complete, stable, reviewer-ready apps.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock-FF9900?logo=amazon-web-services)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)

---

## What It Does

App Store Review exists for good reason — it keeps the ecosystem safe and high-quality. But navigating the guidelines can be time-consuming, especially when you're not sure what's missing.

AppReady helps you get it right before you submit:

1. **Paste your review feedback** from App Store Connect
2. **AI identifies the relevant guideline** and explains what needs attention
3. **Get a clear action plan** with specific steps to address each item
4. **Submit with confidence** knowing your app is reviewer-ready

No signup required. Free tier available.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4 |
| **Fonts** | Plus Jakarta Sans (body), Outfit (headings) via `next/font` |
| **AI Backend** | AWS Bedrock (Claude Sonnet) |
| **Infrastructure** | AWS |

---

## Project Structure

```
appready/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts          # Review feedback analysis API (Bedrock)
│   │   ├── globals.css               # Global styles, animations
│   │   ├── layout.tsx                # Root layout, font config
│   │   └── page.tsx                  # Landing page
│   └── components/
│       ├── FloatingOrbs.tsx          # Ambient background orbs
│       ├── RejectionParser.tsx       # Feedback input + analysis UI
│       └── WaveCanvas.tsx            # Animated wave canvas
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **AWS credentials** configured locally with access to Bedrock (Claude model enabled in `us-east-1`)

### Installation

```bash
git clone git@github.com:get-sltr/appready.git
cd appready
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## AWS Configuration

The app uses **AWS Bedrock** to power the review feedback analysis. The API route at `/api/analyze` invokes Claude via the `@aws-sdk/client-bedrock-runtime` SDK.

### Required Setup

1. **Enable Claude Sonnet** in your AWS Bedrock console (`us-east-1`)
2. **Configure AWS credentials** — the SDK picks up credentials from the standard chain:
   - Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
   - Shared credentials file (`~/.aws/credentials`)
   - IAM role (if deployed on AWS infrastructure)

### IAM Permissions

The executing role/user needs:

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-6"
}
```

### S3 uploads (`.ipa` → presigned PUT)

The Analyze flow calls `POST /api/upload-ipa` to get a presigned URL, then the **browser uploads directly to S3**. Without the following, uploads fail with 500 (presign) or opaque “network” / 403 errors (browser → S3).

1. **Environment** — set `S3_BUCKET` and `AWS_REGION` (see `amplify.yml` / `.env.production`). The app server needs AWS credentials with `s3:PutObject` on `arn:aws:s3:::YOUR_BUCKET/*` (and the app reads objects with `GetObject` elsewhere — include that too).

2. **Bucket CORS** — required for browser `PUT`. Example (replace origins with your production URL and `http://localhost:3000` for dev):

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 3000
  }
]
```

3. **Block public access** can stay on; presigned URLs do not require a public bucket.

4. **Troubleshooting** — `GET /api/health` reports whether `S3_BUCKET` is set. If presign works but upload fails: almost always **CORS** or **Content-Type** mismatch (the client must send the same `Content-Type` the server used when signing).

---

## API Reference

### `POST /api/analyze`

Analyzes App Store review feedback and returns an action plan.

**Request:**

```json
{
  "email": "Guideline 2.1 - App Completeness. Your app crashed on launch..."
}
```

**Response (200):**

```json
{
  "result": "## Guideline Referenced\nGuideline 2.1 - App Completeness\n\n## What Needs Attention\n..."
}
```

**Error (400):**

```json
{
  "error": "Please paste a valid rejection email."
}
```

---

## Features

| Feature | Description |
|---|---|
| **Smart Analysis Engine** | Parses review feedback, identifies the relevant Apple guidelines, and maps them to clear next steps |
| **AI Review Readiness Check** | Powered by Claude via AWS Bedrock — trained on Apple's App Store Review Guidelines and Human Interface Guidelines |
| **Review Packet Generator** | Auto-generates demo credentials, testing steps, and reviewer notes for App Store Connect |
| **Build Memory** | Tracks your submission history so recurring issues are flagged and cross-referenced |
| **Completeness Dashboard** | Pre-flight checklist: privacy policy, account deletion, screenshots, IAP products, age rating, export compliance — scored 0 to 100 |

---

## Visual Design

- **Dark theme** — pure black (`#000`) background
- **Accent color** — `#ff2d78` (hot pink) for CTAs, highlights, and branding
- **Typography** — Outfit for headings, Plus Jakarta Sans for body
- **Animations** — Canvas-drawn wave lines, floating gradient orbs, CSS `fadeUp` transitions
- **Dot grid** — Subtle radial gradient pattern in bottom-right corner

---

## Pricing Tiers

| Plan | Price | Highlights |
|---|---|---|
| **Free** | $0/forever | 1 scan/month, basic checklist, URL health checks |
| **Indie** | $19/month | 5 scans/month, AI readiness check, review packet generator |
| **Pro** | $49/month | Unlimited scans, App Store Connect integration, team seats |
| **Agency** | $149/month | Multi-app support, client dashboards, white-label packets, API access |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Deployment

The app is deployed on AWS. For deployment setup, ensure:

1. AWS credentials are available to the runtime environment
2. Bedrock model access is enabled in the target region
3. The Next.js app is built and served (e.g., via Amplify, ECS, EC2, or Lambda@Edge)

---

## License

Proprietary — SLTR Digital LLC. All rights reserved.

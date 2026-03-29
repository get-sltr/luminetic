# Blog System Design — Luminetic

**Date:** 2026-03-29
**Status:** Draft

## Overview

Add an MDX-powered blog to Luminetic at `/blog` with static generation for SEO, Article structured data for Google rich results, and a CTA-driven layout to convert ad campaign traffic into signups.

## Architecture

### Content Layer

- **Engine:** `next-mdx-remote` — compiles MDX on the server, no bundler plugin required
- **Content directory:** `content/blog/` at project root
- **File format:** `.mdx` files with YAML frontmatter
- **Slug derived from filename:** `why-most-apps-fail-app-store-review.mdx` → `/blog/why-most-apps-fail-app-store-review`

### Frontmatter Schema

```yaml
title: "Why Most Apps Fail in App Store Review"
description: "The 5 most common App Store rejection reasons and how to avoid every one of them before you hit Submit."
date: "2026-03-29"
author: "Luminetic"
tags: ["app-store", "review", "rejection"]
featured: true
ogImage: "/blog/og/why-most-apps-fail.png"
canonical: "https://luminetic.io/blog/why-most-apps-fail-app-store-review"
draft: false # when true, post is excluded from blog index
```

### Routes

| Route | Purpose | Rendering |
|-------|---------|-----------|
| `/blog` | Blog index — magazine grid layout | SSG (`generateStaticParams` not needed; reads all posts at build) |
| `/blog/[slug]` | Individual post | SSG via `generateStaticParams` |

### Blog Index Page (`/blog`)

**Magazine grid layout:**
- Featured post (most recent with `featured: true`) as a large hero card spanning full width
- Remaining posts in a 2-column responsive grid below
- Each card shows: title, excerpt (from `description`), date, tags, read time
- Sorted by date descending

### Blog Post Page (`/blog/[slug]`)

**Layout:**
- Header (existing site header with "Blog" nav link added)
- Article content rendered from MDX with custom component map
- CTA banner at bottom: "Ready to pass App Store review? Try Luminetic free" → `/signup`
- Footer (existing site footer)

**Typography:** Follows existing design system — DM Sans body, Bebas Neue headings, Space Mono for code. Max-width content column (~720px) for readability.

### SEO & Meta Tags

**Per-post metadata via `generateMetadata`:**
- `<title>` — post title via template `"%s | Luminetic"`
- `<meta name="description">` — from frontmatter `description`
- `<link rel="canonical">` — from frontmatter `canonical`
- Open Graph: `og:title`, `og:description`, `og:image`, `og:type=article`, `og:url`
- Twitter Card: `summary_large_image`
- `article:published_time`, `article:author`, `article:tag`

**Blog index metadata:**
- Title: "Blog | Luminetic"
- Description: "Insights on App Store submission, review guidelines, and iOS development from the Luminetic team."
- Canonical: `https://luminetic.io/blog`

### Article Structured Data (JSON-LD)

Each post page injects Article schema:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Why Most Apps Fail in App Store Review",
  "description": "...",
  "image": "https://luminetic.io/blog/og/why-most-apps-fail.png",
  "datePublished": "2026-03-29",
  "author": {
    "@type": "Organization",
    "name": "Luminetic",
    "url": "https://luminetic.io"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Luminetic",
    "url": "https://luminetic.io"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://luminetic.io/blog/why-most-apps-fail-app-store-review"
  }
}
```

The blog index page injects a `Blog` schema with `blogPost` array referencing all posts.

### Navigation Changes

- Add "Blog" link to `Header.tsx` desktop nav (between logo and "Log in")
- Add "Blog" link to mobile drawer

### Custom MDX Components

Minimal set for launch:
- **`Callout`** — styled tip/warning/info box (orange-accented, fits brutalist theme)
- **`CTA`** — inline call-to-action block (reuses the bottom-of-post CTA style)

### Utility: `lib/blog.ts`

Exports:
- `getAllPosts()` — reads `content/blog/`, parses frontmatter, returns sorted post metadata array
- `getPostBySlug(slug)` — reads single MDX file, returns frontmatter + raw MDX source
- `calculateReadTime(content)` — word count / 200, rounded up

## Content Plan

### Post 1 (launch): "Why Most Apps Fail in App Store Review"
- **Angle:** Problem-aware, targets devs who've been rejected or fear rejection
- **Campaign tie-in:** Ad traffic lands here, CTA funnels to signup
- **Sections:** Top 5 rejection reasons (with Apple guideline references), how to catch each before submission, how Luminetic automates this
- **Target length:** ~1,200 words
- **Tags:** app-store, review, rejection
- **Featured:** true

### Post 2 (stub): "What Apple's Review Team Actually Looks For"
- Evergreen SEO piece, insider/educational angle
- Stub file with frontmatter only, `draft: true` flag (filtered from index)

### Post 3 (stub): "Google Trends: What iOS Developers Search For in 2026"
- Data-driven trends piece
- Stub file with frontmatter only, `draft: true` flag

## Files to Create

| File | Purpose |
|------|---------|
| `content/blog/why-most-apps-fail-app-store-review.mdx` | First blog post |
| `content/blog/what-apple-review-team-looks-for.mdx` | Stub post 2 |
| `content/blog/google-trends-ios-developers-2026.mdx` | Stub post 3 |
| `src/app/blog/page.tsx` | Blog index page |
| `src/app/blog/[slug]/page.tsx` | Blog post page |
| `src/lib/blog.ts` | Blog utility functions |
| `src/components/BlogCTA.tsx` | Reusable CTA banner component |
| `src/components/mdx/Callout.tsx` | MDX callout component |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Add "Blog" nav link |
| `package.json` | Add `next-mdx-remote` dependency |

## Out of Scope

- RSS feed (can add later)
- Search / filtering by tag
- Comments
- Cover images (posts use OG images only for social sharing)
- CMS or admin UI for content
- Analytics per post (GA already covers page views)

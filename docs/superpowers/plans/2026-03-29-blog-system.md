# Blog System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an MDX-powered blog to Luminetic with SSG, SEO meta tags, Article structured data, sitemap, auto-generated OG images, and GA4 CTA tracking.

**Architecture:** MDX files in `content/blog/` with YAML frontmatter, compiled server-side by `next-mdx-remote`. Dynamic route `src/app/blog/[slug]/page.tsx` uses `generateStaticParams` to build pages at compile time. Blog utility functions in `src/lib/blog.ts` handle file reading, frontmatter parsing, and read-time calculation.

**Tech Stack:** Next.js 16, next-mdx-remote, next-sitemap, next/og (ImageResponse), gray-matter, Tailwind CSS 4, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/blog.ts` | `getAllPosts()`, `getPostBySlug()`, `calculateReadTime()` — all content I/O |
| `src/app/blog/page.tsx` | Blog index — magazine grid, SSG, Blog schema JSON-LD |
| `src/app/blog/[slug]/page.tsx` | Post page — MDX rendering, `generateStaticParams`, `generateMetadata`, Article schema JSON-LD |
| `src/app/blog/[slug]/opengraph-image.tsx` | Auto-generated OG images via `ImageResponse` |
| `src/components/BlogCTA.tsx` | CTA banner with GA4 `blog_cta_click` event |
| `src/components/mdx/Callout.tsx` | Styled callout box for MDX posts |
| `src/components/Header.tsx` | Modified — add "Blog" nav link |
| `content/blog/*.mdx` | Blog post content files |
| `next-sitemap.config.js` | Sitemap + robots.txt generation config |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install next-mdx-remote, gray-matter, next-sitemap**

```bash
npm install next-mdx-remote gray-matter && npm install -D next-sitemap
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('next-mdx-remote'); require('gray-matter'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Add postbuild script for next-sitemap**

In `package.json`, add to `"scripts"`:

```json
"postbuild": "next-sitemap"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add next-mdx-remote, gray-matter, next-sitemap dependencies"
```

---

### Task 2: Blog Utility Library + Tests

**Files:**
- Create: `src/lib/blog.ts`
- Create: `src/lib/blog.test.ts`
- Create: `content/blog/why-most-apps-fail-app-store-review.mdx` (minimal stub for tests)

- [ ] **Step 1: Create minimal MDX stub for testing**

Create `content/blog/why-most-apps-fail-app-store-review.mdx`:

```mdx
---
title: "Why Most Apps Fail in App Store Review"
description: "The 5 most common App Store rejection reasons and how to avoid every one of them before you hit Submit."
date: "2026-03-29"
author: "Luminetic"
tags: ["app-store", "review", "rejection"]
featured: true
canonical: "https://luminetic.io/blog/why-most-apps-fail-app-store-review"
draft: false
---

This is a test post with about ten words here.
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/blog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getAllPosts, getPostBySlug, calculateReadTime } from './blog';

describe('calculateReadTime', () => {
  it('counts words and divides by 200, rounded up', () => {
    const text = Array(400).fill('word').join(' ');
    expect(calculateReadTime(text)).toBe(2);
  });

  it('rounds up partial minutes', () => {
    const text = Array(201).fill('word').join(' ');
    expect(calculateReadTime(text)).toBe(2);
  });

  it('returns 1 for very short content', () => {
    expect(calculateReadTime('hello world')).toBe(1);
  });

  it('strips JSX tags before counting', () => {
    const mdx = '<Callout type="warning">hello world</Callout>';
    expect(calculateReadTime(mdx)).toBe(1);
  });

  it('strips import statements before counting', () => {
    const mdx = "import { Callout } from '@/components/mdx/Callout'\n\nhello world";
    expect(calculateReadTime(mdx)).toBe(1);
  });

  it('strips component self-closing tags', () => {
    const mdx = '<CTA slug="test" location="inline" />\n\nhello world';
    expect(calculateReadTime(mdx)).toBe(1);
  });
});

describe('getAllPosts', () => {
  it('returns an array of posts sorted by date descending', () => {
    const posts = getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(1);
    expect(posts[0].slug).toBe('why-most-apps-fail-app-store-review');
    expect(posts[0].title).toBe('Why Most Apps Fail in App Store Review');
    expect(posts[0].readTime).toBeGreaterThanOrEqual(1);
  });

  it('excludes draft posts', () => {
    const posts = getAllPosts();
    const drafts = posts.filter((p) => p.draft === true);
    expect(drafts.length).toBe(0);
  });
});

describe('getPostBySlug', () => {
  it('returns frontmatter and raw MDX source for a valid slug', () => {
    const post = getPostBySlug('why-most-apps-fail-app-store-review');
    expect(post).not.toBeNull();
    expect(post!.frontmatter.title).toBe('Why Most Apps Fail in App Store Review');
    expect(post!.source).toContain('test post');
  });

  it('returns null for a non-existent slug', () => {
    const post = getPostBySlug('does-not-exist');
    expect(post).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/lib/blog.test.ts
```

Expected: FAIL — `Cannot find module './blog'`

- [ ] **Step 4: Implement `src/lib/blog.ts`**

```ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  featured: boolean;
  ogImage?: string;
  canonical: string;
  draft: boolean;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
  readTime: number;
}

export interface Post {
  frontmatter: PostFrontmatter;
  source: string;
  slug: string;
  readTime: number;
}

export function calculateReadTime(content: string): number {
  const stripped = content
    .replace(/^import\s+.*$/gm, '')           // strip import statements
    .replace(/<\/?[A-Z][A-Za-z]*[^>]*\/?>/g, '') // strip JSX component tags
    .replace(/<[a-z][^>]*\/?>/g, '')            // strip HTML tags
    .trim();
  const words = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));

  const posts: PostMeta[] = files
    .map((filename) => {
      const filePath = path.join(BLOG_DIR, filename);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);
      const frontmatter = data as PostFrontmatter;

      if (frontmatter.draft) return null;

      return {
        ...frontmatter,
        slug: filename.replace(/\.mdx$/, ''),
        readTime: calculateReadTime(content),
      };
    })
    .filter((p): p is PostMeta => p !== null);

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const frontmatter = data as PostFrontmatter;

  return {
    frontmatter,
    source: content,
    slug,
    readTime: calculateReadTime(content),
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/lib/blog.test.ts
```

Expected: All 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/blog.ts src/lib/blog.test.ts content/blog/why-most-apps-fail-app-store-review.mdx
git commit -m "feat: add blog utility library with tests"
```

---

### Task 3: BlogCTA Component

**Files:**
- Create: `src/components/BlogCTA.tsx`

- [ ] **Step 1: Create BlogCTA component**

Create `src/components/BlogCTA.tsx`:

```tsx
'use client';

import Link from 'next/link';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface BlogCTAProps {
  slug: string;
  location?: 'bottom' | 'inline';
}

export default function BlogCTA({ slug, location = 'bottom' }: BlogCTAProps) {
  const handleClick = () => {
    window.gtag?.('event', 'blog_cta_click', {
      post_slug: slug,
      cta_location: location,
    });
  };

  return (
    <div
      style={{
        marginTop: 64,
        padding: '48px 32px',
        background: 'var(--glass)',
        border: '1px solid var(--glass-border)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.6rem',
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: 'var(--orange)',
          marginBottom: 12,
        }}
      >
        // Stop guessing
      </p>
      <h3
        style={{
          fontFamily: 'var(--display)',
          fontSize: '2rem',
          letterSpacing: 2,
          color: 'var(--text)',
          margin: '0 0 12px',
        }}
      >
        Ready to pass App Store review?
      </h3>
      <p
        style={{
          fontFamily: 'var(--body)',
          fontSize: '0.95rem',
          color: 'var(--text-mid)',
          marginBottom: 28,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Upload your .ipa and get AI-powered analysis against Apple&apos;s 114
        review guidelines. Know before you submit.
      </p>
      <Link
        href="/signup"
        onClick={handleClick}
        className="no-underline"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.6rem',
          letterSpacing: 3,
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#000000',
          background: 'var(--orange)',
          padding: '14px 40px',
          display: 'inline-block',
          boxShadow: '0 0 20px rgba(255, 122, 26, 0.4)',
          transition: 'all 0.2s ease',
        }}
      >
        Try Luminetic Free
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BlogCTA.tsx
git commit -m "feat: add BlogCTA component with GA4 event tracking"
```

---

### Task 4: MDX Callout Component

**Files:**
- Create: `src/components/mdx/Callout.tsx`

- [ ] **Step 1: Create Callout component**

Create `src/components/mdx/Callout.tsx`:

```tsx
interface CalloutProps {
  type?: 'tip' | 'warning' | 'info';
  children: React.ReactNode;
}

const styles: Record<string, { borderColor: string; label: string }> = {
  tip: { borderColor: 'var(--orange)', label: '// Tip' },
  warning: { borderColor: 'var(--warning)', label: '// Warning' },
  info: { borderColor: 'var(--blue)', label: '// Info' },
};

export default function Callout({ type = 'tip', children }: CalloutProps) {
  const { borderColor, label } = styles[type];

  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        padding: '16px 20px',
        margin: '24px 0',
        background: 'var(--glass)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.55rem',
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: borderColor,
          display: 'block',
          marginBottom: 8,
        }}
      >
        {label}
      </span>
      <div
        style={{
          fontFamily: 'var(--body)',
          fontSize: '0.9rem',
          color: 'var(--text-mid)',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mdx/Callout.tsx
git commit -m "feat: add MDX Callout component"
```

---

### Task 5: Blog Post Page (`/blog/[slug]`)

**Files:**
- Create: `src/app/blog/[slug]/page.tsx`

- [ ] **Step 1: Create the blog post page**

Create `src/app/blog/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogCTA from '@/components/BlogCTA';
import Callout from '@/components/mdx/Callout';
import { getAllPosts, getPostBySlug } from '@/lib/blog';

const mdxComponents = {
  Callout,
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const { frontmatter: fm } = post;

  return {
    title: fm.title,
    description: fm.description,
    alternates: { canonical: fm.canonical },
    openGraph: {
      title: fm.title,
      description: fm.description,
      type: 'article',
      url: fm.canonical,
      siteName: 'Luminetic',
      publishedTime: fm.date,
      authors: [fm.author],
      tags: fm.tags,
      ...(fm.ogImage ? { images: [{ url: fm.ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fm.title,
      description: fm.description,
      creator: '@luminetic',
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter: fm, source, readTime } = post;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: fm.title,
    description: fm.description,
    image: fm.ogImage
      ? `https://luminetic.io${fm.ogImage}`
      : `https://luminetic.io/blog/${slug}/opengraph-image`,
    datePublished: fm.date,
    author: {
      '@type': 'Organization',
      name: 'Luminetic',
      url: 'https://luminetic.io',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Luminetic',
      url: 'https://luminetic.io',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fm.canonical,
    },
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="grid-bg" />
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '140px 24px 80px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Post header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.55rem',
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: 'var(--orange)',
              marginBottom: 16,
            }}
          >
            {fm.tags.join(' / ')}
          </div>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              letterSpacing: 2,
              lineHeight: 1.1,
              color: 'var(--text)',
              margin: '0 0 16px',
            }}
          >
            {fm.title}
          </h1>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.65rem',
              color: 'var(--text-dim)',
              letterSpacing: 1,
            }}
          >
            {new Date(fm.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            &middot; {readTime} min read
          </div>
        </div>

        {/* MDX Content */}
        <article className="blog-prose">
          <MDXRemote source={source} components={mdxComponents} />
        </article>

        <BlogCTA slug={slug} />
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Add blog prose styles to globals.css**

Append to `src/app/globals.css`:

```css
/* ========== BLOG ========== */
.blog-card:hover {
  border-color: var(--border-hover) !important;
}
.blog-prose {
  font-family: var(--body);
  font-size: 1.05rem;
  line-height: 1.75;
  color: var(--text-mid);
}
.blog-prose h2 {
  font-family: var(--display);
  font-size: 1.8rem;
  letter-spacing: 2px;
  color: var(--text);
  margin: 48px 0 16px;
}
.blog-prose h3 {
  font-family: var(--display);
  font-size: 1.4rem;
  letter-spacing: 1px;
  color: var(--text);
  margin: 36px 0 12px;
}
.blog-prose p {
  margin: 0 0 20px;
}
.blog-prose a {
  color: var(--orange);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.blog-prose a:hover {
  color: var(--orange-bright);
}
.blog-prose ul,
.blog-prose ol {
  padding-left: 24px;
  margin: 0 0 20px;
}
.blog-prose li {
  margin-bottom: 8px;
}
.blog-prose code {
  font-family: var(--mono);
  font-size: 0.85em;
  background: var(--glass);
  padding: 2px 6px;
  border: 1px solid var(--border);
}
.blog-prose pre {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  padding: 20px;
  overflow-x: auto;
  margin: 0 0 24px;
}
.blog-prose pre code {
  background: none;
  border: none;
  padding: 0;
}
.blog-prose blockquote {
  border-left: 3px solid var(--orange);
  padding: 12px 20px;
  margin: 24px 0;
  color: var(--text-dim);
  font-style: italic;
}
.blog-prose strong {
  color: var(--text);
  font-weight: 600;
}
.blog-prose hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 40px 0;
}
```

- [ ] **Step 3: Verify the post page builds**

```bash
npx next build --webpack 2>&1 | tail -20
```

Expected: Build succeeds, `/blog/why-most-apps-fail-app-store-review` appears in the route list.

- [ ] **Step 4: Commit**

```bash
git add src/app/blog/[slug]/page.tsx src/app/globals.css
git commit -m "feat: add blog post page with MDX rendering, SEO metadata, and Article schema"
```

---

### Task 6: Blog Index Page (`/blog`)

**Files:**
- Create: `src/app/blog/page.tsx`

- [ ] **Step 1: Create the blog index page**

Create `src/app/blog/page.tsx`:

```tsx
import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getAllPosts, type PostMeta } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Insights on App Store submission, review guidelines, and iOS development from the Luminetic team.',
  alternates: { canonical: 'https://luminetic.io/blog' },
  openGraph: {
    title: 'Blog | Luminetic',
    description:
      'Insights on App Store submission, review guidelines, and iOS development from the Luminetic team.',
    url: 'https://luminetic.io/blog',
    siteName: 'Luminetic',
    type: 'website',
  },
};

function PostCard({ post, featured = false }: { post: PostMeta; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="no-underline"
      style={{
        display: 'block',
        background: 'var(--glass)',
        border: '1px solid var(--border)',
        padding: featured ? '40px 32px' : '24px 20px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        gridColumn: featured ? '1 / -1' : undefined,
      }}
      className="no-underline blog-card"
    >
      {featured && (
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.5rem',
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'var(--orange)',
            display: 'block',
            marginBottom: 12,
          }}
        >
          // Featured
        </span>
      )}
      <h2
        style={{
          fontFamily: 'var(--display)',
          fontSize: featured ? 'clamp(1.6rem, 4vw, 2.4rem)' : '1.3rem',
          letterSpacing: 2,
          color: 'var(--text)',
          margin: '0 0 8px',
          lineHeight: 1.15,
        }}
      >
        {post.title}
      </h2>
      <p
        style={{
          fontFamily: 'var(--body)',
          fontSize: featured ? '0.95rem' : '0.85rem',
          color: 'var(--text-dim)',
          margin: '0 0 12px',
          lineHeight: 1.5,
        }}
      >
        {post.description}
      </p>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {post.tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.5rem',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: 'var(--orange)',
              background: 'var(--orange-dim)',
              padding: '3px 10px',
            }}
          >
            {tag}
          </span>
        ))}
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '0.6rem',
            color: 'var(--text-dim)',
            marginLeft: 'auto',
          }}
        >
          {post.readTime} min &middot;{' '}
          {new Date(post.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
    </Link>
  );
}

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.slug !== featured?.slug);

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Luminetic Blog',
    url: 'https://luminetic.io/blog',
    description: 'Insights on App Store submission and iOS development.',
    publisher: {
      '@type': 'Organization',
      name: 'Luminetic',
      url: 'https://luminetic.io',
    },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `https://luminetic.io/blog/${p.slug}`,
      datePublished: p.date,
    })),
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="grid-bg" />
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />

      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '140px 24px 80px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: 48 }}>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.58rem',
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: 'var(--orange)',
              display: 'block',
              marginBottom: 16,
            }}
          >
            // Blog
          </span>
          <h1
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(2.4rem, 6vw, 3.6rem)',
              letterSpacing: 3,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Submission Intelligence
          </h1>
          <p
            style={{
              fontFamily: 'var(--body)',
              fontSize: '1rem',
              color: 'var(--text-dim)',
              marginTop: 12,
            }}
          >
            Insights on passing App Store review, from the team building the tools to automate it.
          </p>
        </div>

        {posts.length === 0 ? (
          <p style={{ fontFamily: 'var(--body)', color: 'var(--text-dim)' }}>
            No posts yet. Check back soon.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
            }}
          >
            {featured && <PostCard post={featured} featured />}
            {rest.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Verify the index page builds**

```bash
npx next build --webpack 2>&1 | tail -20
```

Expected: Build succeeds, `/blog` appears in the route list.

- [ ] **Step 3: Commit**

```bash
git add src/app/blog/page.tsx
git commit -m "feat: add blog index page with magazine grid layout and Blog schema"
```

---

### Task 7: OG Image Generation

**Files:**
- Create: `src/app/blog/[slug]/opengraph-image.tsx`

- [ ] **Step 1: Create the OG image route**

Create `src/app/blog/[slug]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';
import { getPostBySlug, getAllPosts } from '@/lib/blog';

export const alt = 'Luminetic Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.frontmatter.title ?? 'Luminetic Blog';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          background: '#050505',
          position: 'relative',
        }}
      >
        {/* Orange accent line at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#ff7a1a',
          }}
        />

        {/* Logo area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#ff7a1a',
            }}
          />
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: 2,
            }}
          >
            Luminetic
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 80,
            fontSize: 16,
            color: '#808080',
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          luminetic.io/blog
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/blog/[slug]/opengraph-image.tsx
git commit -m "feat: add auto-generated OG images for blog posts"
```

---

### Task 8: Header Navigation Update

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Add Blog link to desktop nav**

In `src/components/Header.tsx`, find the desktop nav section (the `<nav className="hidden md:flex items-center gap-6">` block). Add a Blog link before the "Log in" link:

```tsx
          <Link href="/blog" className="no-underline"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.6rem',
              letterSpacing: 3,
              textTransform: 'uppercase',
              fontWeight: 500,
              color: '#ffffff',
              padding: '10px 16px',
              transition: 'color 0.2s, text-shadow 0.2s',
            }}>
            Blog
          </Link>
```

Insert this immediately after the opening `<nav>` tag and before the "Log in" `<Link>`.

- [ ] **Step 2: Add Blog link to mobile drawer**

In the mobile drawer `<nav>` section, add a Blog link before the "Log in" link:

```tsx
            <Link href="/blog" className="hover-text text-[15px] no-underline" style={{ color: 'var(--gray)' }}
              onClick={() => setMobileOpen(false)}>
              Blog
            </Link>
```

Insert this before the existing "Log in" `<Link>`.

- [ ] **Step 3: Verify in dev server**

```bash
npx next dev &
sleep 3
curl -s http://localhost:3000 | grep -o 'href="/blog"' | head -1
```

Expected: `href="/blog"`

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: add Blog link to header navigation"
```

---

### Task 9: Sitemap & robots.txt Configuration

**Files:**
- Create: `next-sitemap.config.js`

- [ ] **Step 1: Create next-sitemap config**

Create `next-sitemap.config.js` at project root:

```js
/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://luminetic.io',
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 5000,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/analyze/', '/history/', '/completeness/', '/review-packet/', '/memory/'],
      },
    ],
  },
};
```

- [ ] **Step 2: Verify postbuild script exists**

Check `package.json` has the `"postbuild": "next-sitemap"` script (added in Task 1). If not, add it.

- [ ] **Step 3: Test sitemap generation**

```bash
npx next build --webpack && npx next-sitemap
ls -la public/sitemap*.xml public/robots.txt
```

Expected: `sitemap.xml`, `sitemap-0.xml`, and `robots.txt` created in `public/`.

- [ ] **Step 4: Commit**

```bash
git add next-sitemap.config.js
git commit -m "feat: add next-sitemap config for sitemap.xml and robots.txt"
```

---

### Task 10: Write First Blog Post Content

**Files:**
- Modify: `content/blog/why-most-apps-fail-app-store-review.mdx`
- Create: `content/blog/what-apple-review-team-looks-for.mdx`
- Create: `content/blog/google-trends-ios-developers-2026.mdx`

- [ ] **Step 1: Write the full first post**

Replace the test stub in `content/blog/why-most-apps-fail-app-store-review.mdx` with the full ~1,200 word post:

```mdx
---
title: "Why Most Apps Fail in App Store Review"
description: "The 5 most common App Store rejection reasons and how to avoid every one of them before you hit Submit."
date: "2026-03-29"
author: "Luminetic"
tags: ["app-store", "review", "rejection"]
featured: true
canonical: "https://luminetic.io/blog/why-most-apps-fail-app-store-review"
draft: false
---

You spent months building your app. The UI is polished, the features work, and your beta testers love it. You hit Submit for Review, sit back, and wait.

Two days later: **Rejected.**

You're not alone. According to Apple's own transparency reports, roughly **40% of app submissions are rejected** on the first attempt. Most rejections come from the same handful of mistakes — and almost every one of them is catchable before you submit.

Here are the five most common rejection reasons and exactly how to avoid them.

## 1. Guideline 2.1 — App Completeness

**What it means:** Your app crashed, had broken links, or showed placeholder content during review.

Apple's review team tests your app on real devices. If they tap a button and nothing happens, if a screen shows "Lorem ipsum," or if the app crashes on launch — it's an instant rejection.

**How to catch it:**
- Test every screen on a physical device, not just the simulator
- Search your entire codebase for placeholder text (`TODO`, `Lorem`, `placeholder`)
- Test with airplane mode — does your app handle no-network gracefully?

<Callout type="tip">
Luminetic's AI analysis scans your .ipa binary for crash-prone patterns, dead code paths, and placeholder content automatically. It catches what manual testing misses.
</Callout>

## 2. Guideline 5.1.1 — Data Collection and Storage (Privacy)

**What it means:** Your app collects user data without proper disclosure, or your privacy policy doesn't match your App Privacy labels.

Since iOS 14.5, Apple has been aggressive about privacy enforcement. If your app uses location, contacts, photos, or any tracking — your privacy nutrition labels in App Store Connect must match exactly.

**How to catch it:**
- Audit every permission your app requests (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, etc.)
- Cross-reference your Info.plist permissions against your App Privacy labels
- Make sure your privacy policy URL is live and covers every data type you collect

## 3. Guideline 4.0 — Design (Minimum Functionality)

**What it means:** Your app is too simple, is a repackaged website, or doesn't provide enough value to justify being a native app.

Apple rejects apps that are essentially web wrappers (WKWebView loading a URL), apps that duplicate built-in iOS functionality without adding value, and apps that feel like templates with minimal customization.

**How to catch it:**
- If your app uses WebView for core functionality, rethink the approach
- Make sure your app does something that Safari can't
- Add native features: push notifications, widgets, offline support, haptics

## 4. Guideline 2.3 — Accurate Metadata

**What it means:** Your screenshots, description, or app name are misleading or don't match what the app actually does.

Common triggers:
- Screenshots showing features that don't exist yet
- App name stuffing keywords ("Best Weather App - Free Weather Forecast Daily Radar")
- Descriptions claiming functionality the app doesn't have

**How to catch it:**
- Take fresh screenshots from the current build, not mockups
- Keep your app name under 30 characters and descriptive
- Read your description as if you're a reviewer — does every claim hold up?

## 5. Guideline 2.5.1 — Software Requirements (API Usage)

**What it means:** Your app uses private APIs, deprecated frameworks, or doesn't support the required iOS version.

Apple scans your binary for private API calls. Even if you didn't call them directly, a third-party SDK in your project might. This is one of the hardest rejections to debug because the offending code isn't always yours.

**How to catch it:**
- Check every third-party SDK for known private API usage
- Build against the latest Xcode and iOS SDK
- Test on the minimum iOS version you support — not just the latest

<Callout type="warning">
Third-party SDKs are the number one source of private API rejections. If you're using an SDK that hasn't been updated in over a year, it's a risk.
</Callout>

## The Pattern

Notice something? Every rejection above is **detectable before submission.** The problem isn't that these issues are hard to fix — it's that developers don't know to look for them.

That's exactly why we built Luminetic. Upload your `.ipa` file and our AI models scan your binary against Apple's 114 review guidelines. You get:

- A **readiness score** so you know where you stand
- **Specific issues** mapped to the exact guideline they violate
- **Auto-generated test suites** (Maestro & Detox) targeting your weak spots
- An **action plan** to fix everything before you submit

Stop guessing whether your app will pass review. **Know before you submit.**
```

- [ ] **Step 2: Create stub post 2**

Create `content/blog/what-apple-review-team-looks-for.mdx`:

```mdx
---
title: "What Apple's Review Team Actually Looks For"
description: "Inside Apple's app review process — from automated binary scans to human evaluation. What the review team checks and in what order."
date: "2026-04-05"
author: "Luminetic"
tags: ["app-store", "review", "deep-dive"]
featured: false
canonical: "https://luminetic.io/blog/what-apple-review-team-looks-for"
draft: true
---

Coming soon.
```

- [ ] **Step 3: Create stub post 3**

Create `content/blog/google-trends-ios-developers-2026.mdx`:

```mdx
---
title: "Google Trends: What iOS Developers Search For in 2026"
description: "We analyzed Google Trends data to find what iOS developers are searching for most — and what it reveals about the biggest pain points in app development."
date: "2026-04-12"
author: "Luminetic"
tags: ["trends", "ios", "data"]
featured: false
canonical: "https://luminetic.io/blog/google-trends-ios-developers-2026"
draft: true
---

Coming soon.
```

- [ ] **Step 4: Re-run tests to make sure the updated post still passes**

```bash
npx vitest run src/lib/blog.test.ts
```

Expected: All tests PASS (the `getAllPosts` test should still find the post, and draft posts should be excluded).

- [ ] **Step 5: Commit**

```bash
git add content/blog/
git commit -m "feat: add first blog post and draft stubs for upcoming posts"
```

---

### Task 11: Final Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npx next build --webpack
```

Expected: Build succeeds. Routes should include:
- `/blog` (static)
- `/blog/why-most-apps-fail-app-store-review` (static)

Draft posts should NOT appear in the route output.

- [ ] **Step 3: Generate sitemap**

```bash
npx next-sitemap
cat public/sitemap-0.xml | grep -o '<loc>[^<]*</loc>'
```

Expected: `https://luminetic.io/blog` and `https://luminetic.io/blog/why-most-apps-fail-app-store-review` appear. No draft post URLs.

- [ ] **Step 4: Spot-check in dev server**

```bash
npx next dev
```

Open in browser and verify:
- `http://localhost:3000/blog` shows magazine grid with the featured post
- `http://localhost:3000/blog/why-most-apps-fail-app-store-review` renders the full post with CTA at bottom
- Header has "Blog" link on desktop and mobile
- View page source confirms JSON-LD Article schema is present

- [ ] **Step 5: Final commit if any fixups were needed**

```bash
git add -A
git commit -m "fix: final adjustments from build verification"
```

(Skip if no changes were needed.)

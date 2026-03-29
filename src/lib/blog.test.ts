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
    expect(post!.source).toContain('App Store');
  });

  it('returns null for a non-existent slug', () => {
    const post = getPostBySlug('does-not-exist');
    expect(post).toBeNull();
  });

  it('returns null for path traversal attempts', () => {
    expect(getPostBySlug('../../etc/passwd')).toBeNull();
    expect(getPostBySlug('../src/lib/blog')).toBeNull();
    expect(getPostBySlug('foo/bar')).toBeNull();
  });
});

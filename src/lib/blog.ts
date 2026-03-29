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
    .replace(/^import\s+.*$/gm, '')
    .replace(/<\/?[A-Z][A-Za-z]*[^>]*\/?>/g, '')
    .replace(/<[a-z][^>]*\/?>/g, '')
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

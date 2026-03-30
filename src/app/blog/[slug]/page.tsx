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
      ? (fm.ogImage.startsWith('http') ? fm.ogImage : `https://luminetic.io${fm.ogImage}`)
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
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
            {new Date(fm.date + 'T00:00:00').toLocaleDateString('en-US', {
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

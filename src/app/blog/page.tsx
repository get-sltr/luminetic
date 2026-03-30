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
      style={{
        display: 'block',
        background: 'var(--bg-elevated)',
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
          {new Date(post.date + 'T00:00:00').toLocaleDateString('en-US', {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd).replace(/</g, '\\u003c') }}
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
          {/* Blog brand — liquid glass lime */}
          <h1
            className="blog-brand"
            style={{
              fontFamily: 'var(--display)',
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              letterSpacing: 4,
              margin: '0 0 8px',
              lineHeight: 1,
            }}
          >
            Submission Intelligence
          </h1>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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

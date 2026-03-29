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

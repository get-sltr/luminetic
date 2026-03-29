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

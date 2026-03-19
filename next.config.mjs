/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
    // FastAPI collection routes use `"/"` → backend path must end with `/` before query string.
    // Without this, `/api/raw-materials?outlet_id=1` proxies to `/raw-materials?...` and returns 404.
    const fastApiCollectionSlugs = [
      'raw-materials',
      'products',
      'tables',
      'credit-clients',
      'raw-material-sales',
      'kots',
      'transfers',
    ];
    const collectionRewrites = fastApiCollectionSlugs.map((slug) => ({
      source: `/api/${slug}`,
      destination: `${apiUrl}/${slug}/`,
    }));
    return [
      ...collectionRewrites,
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;

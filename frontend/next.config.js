/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SKIP_ENV_VALIDATION: 'true',
  },
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://api:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

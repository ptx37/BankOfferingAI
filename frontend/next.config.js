/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static generation for pages that use dynamic data
  env: {
    SKIP_ENV_VALIDATION: 'true',
  },
  // Configure static generation
  staticPageGenerationTimeout: 60,
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;

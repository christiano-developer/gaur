/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove deprecated appDir option - App Router is now stable in Next.js 15
  images: {
    domains: ['localhost'],
  },
  env: {
    GAUR_API_URL: process.env.GAUR_API_URL || 'http://localhost:8000',
  },
  // Set output file tracing root to silence workspace warning
  outputFileTracingRoot: '/Users/christianofernandes/developer/gaur/frontend',
}

module.exports = nextConfig

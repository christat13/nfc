// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ⛳️ this disables ESLint checks on build (Vercel will no longer block it)
  },
};

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The legacy single-file build is kept in legacy/ as the reference while
  // pages are ported. It is not part of the app and must not be compiled.
  outputFileTracingExcludes: { '*': ['./legacy/**'] },
};

module.exports = nextConfig;

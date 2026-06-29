// @ts-check

/**
 * Next.js configuration for the Agent Watson web application.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@agent-watson/shared", "@agent-watson/ui", "@agent-watson/config"],
};

module.exports = nextConfig;

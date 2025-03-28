// next.config.js
module.exports = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["yims-125a2.web.app"],
    unoptimized: true, // Disable image optimization
  },
};

// next.config.js
module.exports = {
  output: "export",
  images: {
    domains: ["yims-125a2.web.app"],
    unoptimized: true, // Disable image optimization
  },
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

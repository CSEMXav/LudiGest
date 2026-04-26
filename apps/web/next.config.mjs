/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cf.geekdo-images.com",
      },
      {
        protocol: "https",
        hostname: "*.geekdo-images.com",
      },
    ],
  },
  transpilePackages: ["@ludigest/types"],
};

export default nextConfig;

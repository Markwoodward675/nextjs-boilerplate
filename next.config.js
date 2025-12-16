/** @type {import('next').NextConfig} */
const nextConfig = {
  // IMPORTANT: Do NOT use `output: "export"` on Vercel if you have API routes.
  // Leaving it unset ensures normal Next.js server build.

  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return [
      // Old auth paths → new app routes
      {
        source: "/auth/register",
        destination: "/signup",
        permanent: true,
      },
      {
        source: "/auth/login",
        destination: "/signin",
        permanent: true,
      },
      {
        source: "/auth/signout",
        destination: "/signout",
        permanent: true,
      },

      // (Optional) if any old marketing URL existed
      {
        source: "/auth",
        destination: "/signin",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;

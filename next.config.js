/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
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
    ];
  },
};

module.exports = nextConfig;

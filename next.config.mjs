/** @type {import('next').NextConfig} */
const nextConfig = {
  // Menonaktifkan lint saat build jika perlu mempercepat proses
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, 
  },
};

export default nextConfig;

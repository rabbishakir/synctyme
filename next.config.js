/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Docker deployment
  images: {
    domains: ['fqwwhanapbfjesjnuxmh.supabase.co'], // Replace with your Supabase URL
  },
}

module.exports = nextConfig

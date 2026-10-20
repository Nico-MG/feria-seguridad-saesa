import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseImagePattern = supabaseUrl
  ? new URL("/storage/v1/object/public/feria-game-images/**", supabaseUrl)
  : null;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.49.237.16"],
  images: {
    remotePatterns: supabaseImagePattern ? [supabaseImagePattern] : [],
  },
};

export default nextConfig;

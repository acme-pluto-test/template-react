import type { NextConfig } from "next";

// A static export: CloudFront serves out/ from S3. No server features (see react-static-export).
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default config;

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withSentryConfig(nextConfig, {
  org: "kollahar",
  project: "sentry-kollahar",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});

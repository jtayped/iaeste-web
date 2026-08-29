import path from "node:path";

import { withPayload } from "@payloadcms/next/withPayload";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: "standalone"`: the CMS image ships the full pruned
  // node_modules and runs `next start`, because the standalone tracer
  // under-includes the `payload` package (breaking the migration CLI and
  // parts of the admin). See apps/cms/Dockerfile.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // Payload's admin panel is entirely server/client React inside this app;
  // it renders no <Image> from a remote host, and the public blog API only
  // returns JSON. Keep the remote pattern list empty here.
  images: { remotePatterns: [] },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });

import path from "node:path";

import { withPayload } from "@payloadcms/next/withPayload";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // The monorepo root, so the standalone tracer bundles the hoisted
  // node_modules the CMS shares with the rest of the workspace.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // Payload's admin panel is entirely server/client React inside this app;
  // it renders no <Image> from a remote host, and the public blog API only
  // returns JSON. Keep the remote pattern list empty here.
  images: { remotePatterns: [] },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });

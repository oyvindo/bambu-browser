// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Øyvind Øyen

import type { NextConfig } from "next";

/** Comma-separated hosts from env, e.g. `ALLOWED_DEV_ORIGINS=192.168.1.5,phone.local` */
const envDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const electronStaticExport = process.env.ELECTRON_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Next.js 16+ blocks cross-origin dev resources (HMR, etc.) from non-localhost origins
  // unless listed here. Match the "Network:" URL from `next dev` or set ALLOWED_DEV_ORIGINS.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["127.0.0.1", "192.168.68.58", ...envDevOrigins],
  devIndicators: false,
  // Only for `npm run build:electron`. Leave unset so `npm run build` / `npm start` stay a Node server.
  ...(electronStaticExport
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;

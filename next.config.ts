// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Øyvind Øyen

import type { NextConfig } from "next";

/** Comma-separated hosts from env, e.g. `ALLOWED_DEV_ORIGINS=192.168.1.5,phone.local` */
const envDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  // Next.js 16+ blocks cross-origin dev resources (HMR, etc.) from non-localhost origins
  // unless listed here. Match the "Network:" URL from `next dev` or set ALLOWED_DEV_ORIGINS.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: ["192.168.68.58", ...envDevOrigins],
};

export default nextConfig;

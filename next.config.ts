import type { NextConfig } from "next"
import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
    reactStrictMode: true
}

const withMDX = createMDX();
export default withMDX(nextConfig)
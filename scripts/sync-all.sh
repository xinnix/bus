#!/bin/bash
set -e

echo "Generating Prisma Client..."
pnpm --filter @sanqin/database exec prisma generate

echo "Building shared package..."
pnpm --filter @sanqin/shared build

echo "Sync complete."

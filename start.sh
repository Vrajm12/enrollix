#!/bin/bash
cd "$(dirname "$0")/backend" || exit 1
npx prisma migrate deploy || true
npx prisma db seed || true
node dist/src/index.js

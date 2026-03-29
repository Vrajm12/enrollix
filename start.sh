#!/bin/bash
cd "$(dirname "$0")/backend" || exit 1
npx prisma migrate deploy --skip-generate
npx prisma db seed
node dist/src/index.js

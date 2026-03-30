#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/backend" || exit 1
npx prisma migrate deploy
npx prisma db seed
exec node dist/src/index.js

#!/bin/bash
cd "$(dirname "$0")/backend" || exit 1
node dist/src/index.js

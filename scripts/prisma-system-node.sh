#!/bin/sh
cd "$(dirname "$0")/.." || exit 1
exec /usr/bin/node ./node_modules/prisma/build/index.js "$@"

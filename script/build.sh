#!/bin/bash
set -e

if [ -f "./node_modules/.bin/tsx" ]; then
  ./node_modules/.bin/tsx script/build.ts
else
  npx --yes tsx script/build.ts
fi

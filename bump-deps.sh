#!/bin/bash

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

fnm use

npx --yes npm-check-updates -u --cooldown 1d "$@"

npm install

npx --no-install biome migrate --write

npm run check
npm run lint

npm audit

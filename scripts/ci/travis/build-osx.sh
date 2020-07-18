#!/bin/bash

set -ev

./scripts/ci/prepare-webclients.sh

yarn app:dist:base
npm run clean:prebuilds
npx --no-install electron-builder install-app-deps --arch=x64

yarn test:e2e

# preventing "No output has been received in the last 10m0s" error occurring on travis-ci
# see https://github.com/travis-ci/travis-ci/issues/4190#issuecomment-353342526
# output something every 9 minutes (540 seconds) to prevent Travis killing the job
while sleep 540; do echo "=====[ $SECONDS seconds still running ]====="; done &
    yarn electron-builder:dist
# killing background sleep loop
kill %1

yarn scripts/dist-packages/print-hashes

# preventing "No output has been received in the last 10m0s" error occurring on travis-ci
# see https://github.com/travis-ci/travis-ci/issues/4190#issuecomment-353342526
# output something every 9 minutes (540 seconds) to prevent Travis killing the job
while sleep 540; do echo "=====[ $SECONDS seconds still running ]====="; done &
    yarn scripts/dist-packages/upload
# killing background sleep loop
kill %1

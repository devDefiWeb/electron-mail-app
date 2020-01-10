#!/bin/bash

set -ev

ARCHIVE_FILE=$1

# paths string separated with ";"
WEBCLIENT_DIST_PATHS_STRING=$(yarn --silent scripts/ci/print-webclients-dist-paths-pattern)
# split paths string to array
WEBCLIENT_DIST_PATHS=$(IFS=';';echo $WEBCLIENT_DIST_PATHS_STRING);

# create empty archive
tar cvf $ARCHIVE_FILE --files-from /dev/null

# append to archive
for VARIABLE in $WEBCLIENT_DIST_PATHS
do
    find "$VARIABLE" -maxdepth 0 -type d \
        | tar -rf $ARCHIVE_FILE -T -
done

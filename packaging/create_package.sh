#!/bin/sh
# Create a package for the online updater, ignoring all local node_modules
cd ..
PKGVERSION=`cat ./frontend/src/app/version.ts | grep version: | cut -d"'" -f2`
git archive --format=zip HEAD -o $PKGVERSION.zip
echo $PKGVERSION.zip created. Now uploading to S3.
/usr/bin/aws --profile cloudeecms s3 cp $PKGVERSION.zip s3://cloudeecms-updates/cloudeecms/$PKGVERSION.zip --cache-control max-age=3600 --acl public-read
rm $PKGVERSION.zip
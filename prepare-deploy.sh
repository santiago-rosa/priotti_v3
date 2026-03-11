#!/bin/bash

# 1. Compile and Zip Frontend (React)
echo "Building Frontend..."
cd web
npm run build
cd dist
zip -r ../../web-deploy.zip .
cd ../..
echo "Frontend zip created: web-deploy.zip"

# 2. Zip Backend (PHP Slim)
echo "Zipping PHP Backend..."
# We exclude node_modules or any other unnecessary items if they were there
zip -r php-api-deploy.zip php-api/public php-api/src php-api/vendor php-api/logs php-api/.env php-api/composer.json php-api/composer.lock
echo "Backend zip created: php-api-deploy.zip"

echo "Done! Both zips are ready in the root folder."

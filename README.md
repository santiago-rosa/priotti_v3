# Priotti v3 - PHP Migration

This project has been migrated from a Node.js API to a PHP (Slim Framework) API to optimize resource usage on cPanel hosting.

## Project Structure
- `/web`: React (Vite) Frontend.
- `/php-api`: PHP (Slim Framework) Backend.

---

## Deployment Instructions

Every time you add a new feature, you need to "compile" and zip both the Frontend and Backend for deployment to cPanel.

### Option A: Automated (Recommended)
Run the provided script from the root folder:
```bash
chmod +x prepare-deploy.sh
./prepare-deploy.sh
```
This will generate `web-deploy.zip` and `php-api-deploy.zip` in the root directory.

### Option B: Manual Process

#### 1. Frontend (React)
Build the production assets and zip the contents of the `dist` folder:
```bash
cd web
npm run build
cd dist
zip -r ../../web-deploy.zip .
cd ../..
```

#### 2. Backend (PHP)
Zip the necessary PHP files, excluding development-only files:
```bash
zip -r php-api-deploy.zip php-api/public php-api/src php-api/vendor php-api/.env php-api/composer.json php-api/composer.lock
```

---

## Git Maintenance

If you encounter Git push errors due to large files (over 100MB) in your history, use these commands to clean your branch:

```bash
# 1. Reset history to a clean state (keep your code changes)
git reset --soft 32db0e7

# 2. Add current files (this excludes the deleted api/ folder)
git add .

# 3. Commit and Force Push
git commit -m "Complete PHP migration and cleanup"
git push origin deploy-setup --force
```

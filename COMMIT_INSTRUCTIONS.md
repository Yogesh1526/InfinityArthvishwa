# Quick Fix for Netlify Build

## Issue Found:
Service files are not committed to git, so Netlify can't find them during build.

## Quick Fix - Run these commands:

```bash
# Add all service files
git add src/app/services/
git add src/app/auth/
git add src/app/interceptors/
git add src/app/components/

# Add config files
git add netlify.toml
git add angular.json  
git add package.json

# Commit everything
git commit -m "Fix Netlify build: Add service files and update config"

# Push to trigger Netlify rebuild
git push
```

## Verify files are tracked:
```bash
git ls-files src/app/services/
```

You should see:
- PersonalDetailsService.ts
- toast.service.ts
- loader.service.ts
- client-document.service.ts
- role-permission.service.ts


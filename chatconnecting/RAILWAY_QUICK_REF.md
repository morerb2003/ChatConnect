# Railway Deployment - Quick Reference Card

## Before You Start
```bash
# 1. Verify local build works
mvn clean package

# 2. Push to GitHub
git add .
git commit -m "Add Railway deployment files"
git push origin rohit-chat-ui
```

## Files That Make Railway Deployment Work

| File | Purpose |
|------|---------|
| `Procfile` | Tells Railway how to start your app |
| `system.properties` | Specifies Java 17 runtime |
| `Dockerfile` | Multi-stage build (optional but recommended) |
| `railway.json` | Railway-specific configuration |
| `application.properties` | App config with env variables |

## Railway Dashboard - Environment Variables to Set

Copy-paste into Railway Dashboard → Variables:

```
JPA_DDL_AUTO=update
JPA_SHOW_SQL=false
JWT_SECRET=<generate-32-char-random-string>
JWT_EXPIRATION=86400000
APP_CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
APP_WS_ALLOWED_ORIGINS=https://your-frontend-domain.com
SPRING_PROFILES_ACTIVE=prod
```

## Step-by-Step Commands

### 1. Test Build Locally
```bash
cd chatconnecting
mvn clean package
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Add Railway deployment config"
git push origin rohit-chat-ui
```

### 3. Create Railway Project
- Go to railway.app/dashboard
- Click "New Project"
- Select "Deploy from GitHub"
- Choose morerb2003/ChatConnect + rohit-chat-ui branch
- Click "Deploy"

### 4. Add MySQL
- Click "+ Add"
- Select "MySQL"
- Click "Add MySQL"

### 5. Set Environment Variables
- Open Spring Boot Service → Variables
- Add all variables from table above

### 6. Deploy
- Railway auto-detects changes from GitHub
- Or manually trigger: Dashboard → Deploy → "Deploy" button

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Java not detected" | Check system.properties exists |
| "Build fails" | Run `mvn clean package` locally to test |
| "CORS error" | Add frontend URL to APP_CORS_ALLOWED_ORIGINS |
| "Cannot connect DB" | Verify MySQL plugin is added |
| "Port already in use" | Procfile uses `${PORT}` - should auto-work |

## Test Your Deployment

```bash
# Check if app is running
curl https://your-railway-url.railway.app/actuator/health

# Expected response
{"status":"UP"}
```

## Key URLs & Credentials

- Railway Dashboard: https://railway.app/dashboard
- MySQL Plugin: Auto-creates connection, no manual setup
- Your Backend URL: https://[service-name].railway.app (shown in dashboard)
- Health Endpoint: https://[service-name].railway.app/actuator/health

## Important Notes

- ✅ Environment variables are case-sensitive
- ✅ No trailing slashes in URLs
- ✅ JWT_SECRET must be 32+ characters
- ✅ MySQL password is auto-generated, Railway handles it
- ✅ Build takes 3-5 minutes first time
- ✅ App restarts auto on code push to GitHub

## Next: Deploy Frontend

After backend is running, update your frontend:

```javascript
// .env.production
REACT_APP_API_URL=https://your-railway-backend-url.railway.app/api
REACT_APP_WS_URL=https://your-railway-backend-url.railway.app/ws
```

Then deploy frontend to Vercel/Netlify.


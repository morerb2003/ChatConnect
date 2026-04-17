# Railway Deployment - Complete Step-by-Step Fix Guide

## ✅ TL;DR - Quick Fix (30 seconds)

1. **Delete** `chatconnecting/railway.json` - it conflicts with Railway's auto-detection
2. **Keep** `Procfile` and `system.properties` as-is
3. **Push to GitHub** and let Railway auto-detect Java
4. **Add MySQL plugin** in Railway dashboard
5. **Set environment variables**
6. **Deploy!**

---

## Why You're Getting "Railpack Build Error"

### The Problem
```
❌ railway.json forces Dockerfile build
❌ Railway tries to auto-detect Java buildpack
❌ Conflict → "Error creating build plan with Railpack"
```

### The Solution
Let Railway auto-detect your Java project using buildpacks (Railpack) instead of forcing Docker.

---

## Step 1: Fix Your Configuration (CRITICAL)

### Step 1a: Remove railway.json
```bash
cd d:\FroentEnd\ChatConnect\chatconnecting
rm railway.json  # or delete via file explorer
```

**Why?** Railway will automatically:
- Detect `pom.xml` → Java project
- Use Maven buildpack
- Read `system.properties` → Java 17
- Read `Procfile` → how to start app

### Step 1b: Verify Your Procfile is Correct

**File:** `chatconnecting/Procfile`
```
web: java -Dserver.port=${PORT} -jar target/*.jar
```

✅ This is correct - keep it!

### Step 1c: Verify Your system.properties is Correct

**File:** `chatconnecting/system.properties`
```properties
java.runtime.version=17
maven.version=3.9.0
```

✅ This is correct - keep it!

---

## Step 2: Verify Your pom.xml Has MySQL Driver

**File:** `chatconnecting/pom.xml`

Search for MySQL dependency. Should have:
```xml
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.33</version>
</dependency>
```

**If missing**, add it to your dependencies section:
```xml
<dependencies>
    <!-- ... other dependencies ... -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <version>8.0.33</version>
    </dependency>
</dependencies>
```

---

## Step 3: Update application.properties for Production

Your current `application.properties` already uses environment variables ✅ but let's optimize it:

**File:** `chatconnecting/src/main/resources/application.properties`

Replace the entire content with:

```properties
# Application
spring.application.name=chatconnecting

# Database Configuration - Use environment variables from Railway
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/chatconnect}
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# Connection Pool
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.connection-timeout=30000

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:update}
spring.jpa.show-sql=${JPA_SHOW_SQL:false}
spring.jpa.properties.hibernate.format_sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# JWT Configuration
jwt.secret=${JWT_SECRET:default-secret-change-in-production}
jwt.expiration=${JWT_EXPIRATION:86400000}

# CORS Configuration
app.cors.allowed-origins=${APP_CORS_ALLOWED_ORIGINS:http://localhost:5173}
app.ws.allowed-origins=${APP_WS_ALLOWED_ORIGINS:http://localhost:5173}

# File Upload
spring.servlet.multipart.max-file-size=20MB
spring.servlet.multipart.max-request-size=20MB

# Server
server.port=${PORT:8080}
server.shutdown=graceful
server.compression.enabled=true

# Logging
logging.level.root=INFO
logging.level.com.chatconnecting=DEBUG
```

---

## Step 4: Push to GitHub

```bash
cd d:\FroentEnd\ChatConnect

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix Railway deployment: remove railway.json, update configs"

# Push to your branch (replace with your branch name if different)
git push origin main
```

---

## Step 5: Create Railway Project & Deploy

### 5a. Go to Railway Dashboard
- Website: https://railway.app/dashboard
- Sign in with GitHub

### 5b. Create New Project
1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub
4. Select repository: **`morerb2003/ChatConnect`**
5. Select branch: **your branch (main or rohit-chat-ui)**
6. Click **"Deploy"**

### 5c. Railway Auto-Detects
Railway will automatically:
- ✅ Detect Java project (via pom.xml)
- ✅ Use Maven buildpack
- ✅ Set Java 17 (via system.properties)
- ✅ Start with Procfile command
- ✅ Create JAR file
- ✅ Deploy!

**Expected build time:** 2-5 minutes

---

## Step 6: Add MySQL Database

### 6a. In Railway Dashboard
1. Go to your deployed Spring Boot service
2. Click **"+ Add"** button
3. Search for **"MySQL"**
4. Click **"Add MySQL"**
5. Railway provisions a MySQL instance

### 6b: Railway Auto-Creates Environment Variables
Railroad automatically creates these in your Spring Boot service:

| Variable | Example Value |
|----------|---------------|
| `MYSQL_HOST` | `mysql.railway.internal` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_DB` | `railway` |
| `MYSQL_USER` | `root` |
| `MYSQL_PASSWORD` | `random-generated` |

Your app automatically converts these to:
- `DB_URL` = `jdbc:mysql://mysql.railway.internal:3306/railway`
- `DB_USERNAME` = `root`
- `DB_PASSWORD` = `[auto-generated]`

---

## Step 7: Set Environment Variables

### 7a. In Railway Dashboard

1. Go to **Spring Boot Service** → **Variables**
2. Add the following variables (manually, one by one):

| Variable | Value | Description |
|----------|-------|-------------|
| `SPRING_PROFILES_ACTIVE` | `prod` | Production profile |
| `JPA_DDL_AUTO` | `update` | Auto-create/update tables |
| `JPA_SHOW_SQL` | `false` | Don't log SQL in production |
| `JWT_SECRET` | [Strong 32+ char key] | Generate below ↓ |
| `JWT_EXPIRATION` | `86400000` | 24 hours in milliseconds |
| `APP_CORS_ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` | Replace with your deployed frontend |
| `APP_WS_ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` | Same as CORS |

### 7b: Generate Strong JWT Secret

**Option 1: Using PowerShell (Windows)**
```powershell
# Run in PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Min 0 -Max 256) }))
```

**Option 2: Using Online Tool**
- Go to: https://generate-random.org/base64-generator
- Set length to 32+ characters
- Copy the result

**Example JWT Secret (use this, then change it later):**
```
rT9kL2mN5oP3qR8sT1uV4wX7yZ0aB3cD5eF8gH1jK4lM7nO0pQ3rS6tU9vW2xY5zA
```

### 7c: Get Your Frontend URL

Find your deployed frontend URL:
- **Vercel:** https://your-project.vercel.app
- **Netlify:** https://your-project.netlify.app
- **Railway:** Check your frontend service domain

Set both `APP_CORS_ALLOWED_ORIGINS` and `APP_WS_ALLOWED_ORIGINS` to this URL **exactly** (no trailing slash).

---

## Step 8: Deploy Manually (if needed)

If Railway didn't auto-deploy:
1. Go to **Spring Boot Service** → **Settings**
2. Click **"Redeploy"** button
3. Watch the **Deployments** tab
4. Check **Logs** tab when done

---

## Step 9: Verify Deployment

### 9a. Get Your Backend URL

In Railway Dashboard:
1. Go to **Spring Boot Service** → **Settings**
2. Under "Domains" you'll see: `https://chatconnect-prod.railway.app` (example)
3. Copy this URL

### 9b. Test Health Endpoint

```bash
# Replace with your actual URL
curl https://chatconnect-prod.railway.app/actuator/health

# Expected response:
{"status":"UP"}
```

### 9c. Check Application Logs

In Railway Dashboard:
1. Go to **Spring Boot Service** → **Logs**
2. Look for this message (success!):
   ```
   Started ChatconnectingApplication in X seconds
   =============================================================
   Application 'chatconnecting' is running!
   ```

### 9d. Test Database Connection

In Railway Logs, look for:
```
HikariPool-1 - Successfully connected to jdbc:mysql://mysql.railway.internal:3306/railway
```

---

## Step 10: Connect Frontend to Backend

### 10a. Get Backend URL from Railway
- Railway Dashboard → Spring Boot Service → Settings → Domains
- Copy the full URL (e.g., `https://chatconnect-prod.railway.app`)

### 10b. Update Frontend .env

**File:** `Frontend/.env.production`

Create or update this file:
```env
VITE_API_URL=https://chatconnect-prod.railway.app/api
VITE_WS_URL=wss://chatconnect-prod.railway.app/ws
```

**Replace `https://chatconnect-prod.railway.app` with your actual backend URL!**

### 10c. Update Frontend Services (if needed)

**File:** `Frontend/src/services/api.js`

Make sure it uses environment variables:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 10d. Update Frontend WebSocket Service

**File:** `Frontend/src/services/websocketService.js`

Make sure it uses environment variables:
```javascript
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

export const connectWebSocket = () => {
  return new WebSocket(WS_URL);
};
```

### 10e: Rebuild & Redeploy Frontend
```bash
cd Frontend
npm run build
# Then deploy to Vercel/Netlify
```

---

## Troubleshooting Common Issues

### ❌ Issue: "Still getting build error"

**Fix:**
1. Confirm `railway.json` is deleted from `chatconnecting/` folder
2. Verify files exist:
   - ✅ `chatconnecting/Procfile`
   - ✅ `chatconnecting/system.properties`
   - ✅ `chatconnecting/pom.xml`
3. Push to GitHub: `git push origin main`
4. In Railway, click **Settings** → **Redeploy**

---

### ❌ Issue: "Build successful but app won't start"

**Check logs:**
1. Railway Dashboard → Spring Boot Service → Logs
2. Look for error messages
3. Common causes:
   - Wrong database URL
   - Missing environment variables
   - Port already in use

**Fix:**
1. Verify all variables are set (Step 7)
2. Restart service: Settings → Restart

---

### ❌ Issue: "Database connection refused"

**Causes:**
1. MySQL plugin not added
2. MySQL service not running (should have green "Running" status)
3. Wrong database URL format

**Fix:**
1. Verify MySQL plugin exists in Railway dashboard
2. Check MySQL service status (should be green)
3. Confirm `MYSQL_HOST=mysql.railway.internal` (not localhost!)
4. Wait 1-2 minutes for MySQL to be ready
5. Restart Spring Boot service

---

### ❌ Issue: "CORS error from frontend"

**Error in browser console:**
```
Access to XMLHttpRequest at 'https://...' from origin 'https://your-frontend.com' 
has been blocked by CORS policy
```

**Fix:**
1. Get exact frontend URL from Vercel/Netlify
2. Set in Railway:
   - `APP_CORS_ALLOWED_ORIGINS=https://your-exact-url.com` (no trailing slash!)
   - `APP_WS_ALLOWED_ORIGINS=https://your-exact-url.com`
3. Restart service
4. Clear browser cache (Ctrl+Shift+Delete)
5. Test again

---

### ❌ Issue: "503 Bad Gateway"

**Cause:** App crashed or not responding

**Fix:**
1. Check logs for error
2. Restart service: Settings → Restart
3. Wait 1-2 minutes
4. Try again

---

## Complete Checklist

Before deployment, verify all items:

### Local Testing
- [ ] `mvn clean package` succeeds locally
- [ ] `java -jar target/*.jar` runs without errors
- [ ] Can connect to local MySQL

### Repository Structure
- [ ] `chatconnecting/pom.xml` exists
- [ ] `chatconnecting/Procfile` exists
- [ ] `chatconnecting/system.properties` exists
- [ ] `chatconnecting/Dockerfile` exists
- [ ] ~~`chatconnecting/railway.json` DELETED~~ ❌ This should NOT exist
- [ ] `chatconnecting/src/main/resources/application.properties` updated

### GitHub
- [ ] All files pushed to GitHub
- [ ] Branch is set correctly

### Railway Dashboard
- [ ] Project created
- [ ] Spring Boot service deployed
- [ ] MySQL plugin added
- [ ] All environment variables set (Step 7)
- [ ] Frontend URL configured in CORS variables

### Testing
- [ ] Backend health check returns UP
- [ ] Database connection successful (check logs)
- [ ] Frontend can call backend API
- [ ] WebSocket connection works

---

## Next Steps After First Deploy

1. **Test thoroughly** on production URL
2. **Monitor logs** for any errors
3. **Update frontend** with correct backend URL
4. **Test end-to-end flows**:
   - User registration
   - Login
   - Sending messages
   - WebSocket connections
   - File uploads

---

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Spring Boot Docs:** https://spring.io/projects/spring-boot
- **MySQL in Railway:** https://docs.railway.app/guides/mysql
- **Environment Variables:** https://docs.railway.app/develop/variables

---

## Still Having Issues?

1. **Check your logs** first (Railway → Logs tab)
2. **Try the Troubleshooting section** above
3. **Compare with this guide** step-by-step
4. Check Railway status page: https://status.railway.app

Good luck! 🚀

# Railway Deployment - Common Issues & Fixes (Your Project)

## Issue 1: "Error creating build plan with Railpack" ❌

### What Was Causing This
You had `railway.json` with:
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfile": "Dockerfile"
  }
}
```

This forced Docker build while Railway tried to auto-detect Java buildpack → **CONFLICT**

### ✅ Fix Applied
- Deleted `railway.json`
- Railway now auto-detects via `pom.xml`

**Status:** FIXED ✅

---

## Issue 2: "Deployment failed during build process" ❌

### Possible Causes
1. Railway couldn't detect build type (caused by railway.json)
2. Maven cache issues
3. Java version mismatch

### ✅ Solutions

**Solution A: Verify Build Works Locally**
```bash
cd chatconnecting
mvn clean package
java -jar target/chatconnecting-0.0.1-SNAPSHOT.jar
```

Should show:
```
Started ChatconnectingApplication in X seconds
```

**Solution B: Redeploy in Railway**
1. Railway Dashboard → Spring Boot Service
2. Settings → Redeploy
3. Watch Deployments tab

**Solution C: Check Java Version**
- Railway reads `system.properties`
- Your file has: `java.runtime.version=17` ✅

---

## Issue 3: "MySQL connection is also failing" ❌

### Why This Happens Locally
Your `application.properties` has:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/chatconnect
```

**On Railway**, it auto-converts to:
```properties
spring.datasource.url=jdbc:mysql://mysql.railway.internal:3306/railway
```

### Local Testing vs Railway

| Environment | DB Host | Status |
|-------------|---------|--------|
| Local | `localhost` | Start MySQL locally |
| Railway | `mysql.railway.internal` | Railway provides MySQL |

### ✅ Test Locally First

```bash
# Verify MySQL is running locally
mysql -u root -pMore@2525 -e "SELECT 1"

# Then run app with env vars
$env:DB_URL = "jdbc:mysql://localhost:3306/chatconnect"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "More@2525"
java -jar target/chatconnecting-0.0.1-SNAPSHOT.jar
```

### ✅ On Railway
1. Add MySQL plugin (Step 2 in quick start)
2. Set variables
3. Redeploy

---

## Issue 4: Spring Boot Not Auto-Detecting Java

### Why
You had two build configurations competing:
1. `railway.json` → Dockerfile
2. `pom.xml` → Maven buildpack

### ✅ Fixed By
- Deleting `railway.json`
- Keeping `system.properties` and `Procfile`
- Railway now sees `pom.xml` first

---

## Issue 5: Environment Variables Not Applied

### Symptoms
- Backend works but can't connect to DB
- CORS errors from frontend
- Wrong database being used

### ✅ Fixes

**Check Variables Are Set:**
1. Railway Dashboard → Spring Boot Service → Variables
2. Should see all your variables there
3. Not in your code, in Railway dashboard!

**Variables Your Code Expects:**
```properties
${DB_URL}              # Must be set in Railway
${DB_USERNAME}         # Must be set in Railway
${DB_PASSWORD}         # Must be set in Railway
${JWT_SECRET}          # Must be set in Railway
${APP_CORS_ALLOWED_ORIGINS}  # Must be set in Railway
${APP_WS_ALLOWED_ORIGINS}    # Must be set in Railway
```

**Variables Railway Provides:**
```
MYSQL_HOST             # Automatically set
MYSQL_PORT             # Automatically set
MYSQL_DB               # Automatically set
MYSQL_USER             # Automatically set
MYSQL_PASSWORD         # Automatically set
PORT                   # Automatically set
```

---

## Issue 6: "Could not find a version of 'java'"

### Cause
`system.properties` not recognized

### ✅ Your File
```properties
java.runtime.version=17
maven.version=3.9.0
```

This is correct! ✅

---

## Issue 7: Dockerfile Conflicts

### Why It's Not Needed
You already have:
- ✅ `Procfile` (how to run)
- ✅ `system.properties` (which Java)
- ✅ `pom.xml` (how to build)

Railway's buildpack handles everything!

**Dockerfile is optional** if you use buildpacks.

---

## Issue 8: Port Configuration

### Your Procfile
```
web: java -Dserver.port=${PORT} -jar target/*.jar
```

✅ Correct! Railway sets `PORT` automatically.

**Expected:** Port 8080 (Railway assigns)

---

## Issue 9: "Procfile not found" Error

### Why It Happens
- `Procfile` isn't in root directory
- It's in `chatconnecting/` folder (correct location)

### ✅ Your Setup
- `chatconnecting/Procfile` exists ✅
- Railway auto-detects it ✅

---

## Issue 10: Build Takes Too Long

### Normal Times
- First build: 2-5 minutes (downloads dependencies)
- Subsequent: 1-2 minutes (cached)

### If Stuck Over 10 Minutes
1. Check build logs (might be downloading large files)
2. Try smaller commits
3. Contact Railway support if persistent

---

## Quick Diagnostic Steps

If deployment fails, do this:

### Step 1: Check Local Build
```bash
cd chatconnecting
mvn clean package -DskipTests
```

Expected: `BUILD SUCCESS`

### Step 2: Check Procfile
```bash
cd chatconnecting
cat Procfile
```

Expected: 
```
web: java -Dserver.port=${PORT} -jar target/*.jar
```

### Step 3: Check system.properties
```bash
cd chatconnecting
cat system.properties
```

Expected:
```
java.runtime.version=17
maven.version=3.9.0
```

### Step 4: Check pom.xml Exists
```bash
cd chatconnecting
ls pom.xml
```

Expected: File exists ✅

### Step 5: Verify No railway.json
```bash
cd chatconnecting
ls railway.json
```

Expected: File NOT found ✅

---

## Your Current Setup Status

| Component | Status | Notes |
|-----------|--------|-------|
| Java Version | ✅ OK | 17 in system.properties |
| Maven | ✅ OK | mvnw exists, 3.9.0 configured |
| MySQL Driver | ✅ OK | mysql-connector-j in pom.xml |
| Procfile | ✅ OK | Correct format |
| system.properties | ✅ OK | Correct format |
| railway.json | ✅ DELETED | Was causing conflicts |
| application.properties | ✅ UPDATED | Uses environment variables |

---

## Environment Variable Mapping

**Railway → Your Application:**

```
MYSQL_HOST           →  DB_URL (jdbc:mysql://mysql.railway.internal:...)
MYSQL_PORT           →  (part of DB_URL)
MYSQL_DB             →  (part of DB_URL)
MYSQL_USER           →  DB_USERNAME
MYSQL_PASSWORD       →  DB_PASSWORD
PORT                 →  Procfile: ${PORT}
[YOUR_CUSTOM_VARS]   →  application.properties: ${YOUR_CUSTOM_VARS}
```

---

## Next Steps

1. ✅ Code changes pushed to GitHub
2. ⏳ Create Railway project (see RAILWAY_QUICK_START.md)
3. ⏳ Add MySQL plugin
4. ⏳ Set environment variables
5. ⏳ Deploy!

---

## Detailed Guides

- **Quick Start:** RAILWAY_QUICK_START.md
- **Complete Guide:** RAILWAY_COMPLETE_SETUP.md
- **Troubleshooting:** RAILWAY_TROUBLESHOOTING.md (existing file)

---

## Still Having Issues?

1. **Read the logs** (Railway Dashboard → Logs)
2. **Check against this guide**
3. **Compare with RAILWAY_COMPLETE_SETUP.md**
4. **Contact Railway support** if needed

Good luck! 🚀

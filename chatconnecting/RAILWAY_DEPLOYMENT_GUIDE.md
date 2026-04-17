# Railway Deployment Guide for Spring Boot Backend

## Complete Step-by-Step Setup

### Prerequisites
- Railway account (railway.app - sign up free)
- GitHub repository with your code pushed
- MySQL database (Railway will provide via plugin)
- Frontend URL (for CORS configuration)

---

## Step 1: Prepare Your Repository

Your project now has all necessary files:
- ✅ `Procfile` - Tells Railway how to start your app
- ✅ `system.properties` - Specifies Java 17
- ✅ `Dockerfile` - Multi-stage build (recommended)
- ✅ `railway.json` - Railway configuration
- ✅ `pom.xml` - Maven build configuration
- ✅ `application.properties` - Environment variable ready

**Push to GitHub:**
```bash
cd d:\FroentEnd\ChatConnect
git add .
git commit -m "Add Railway deployment configuration"
git push origin rohit-chat-ui
```

---

## Step 2: Create Railway Project

### 2a. Create Project on Railway Dashboard
1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select repository: `morerb2003/ChatConnect`
6. Select branch: `rohit-chat-ui`
7. Click **"Deploy"**

### 2b: Railway Will Auto-Detect
- ✅ Java project (via pom.xml)
- ✅ Maven build system
- ✅ Spring Boot application
- ✅ Procfile configuration

---

## Step 3: Add MySQL Database

### 3a. Add MySQL Plugin
1. In Railway Dashboard, click **"+ Add"** 
2. Search and select **"MySQL"**
3. Click **"Add MySQL"** → Creates automatic connection

### 3b: Variables Auto-Generated
Railway automatically provides these environment variables:
```
MYSQL_HOST=mysql.railway.internal
MYSQL_PORT=3306
MYSQL_DB=chatconnect
MYSQL_USER=root
MYSQL_PASSWORD=<random-generated>
```

Your app automatically reads these via:
```
DB_URL=jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}
DB_USERNAME=${MYSQL_USER}
DB_PASSWORD=${MYSQL_PASSWORD}
```

---

## Step 4: Configure Environment Variables

### 4a. In Railway Dashboard

1. Go to your **Spring Boot Service** → **Variables**
2. Add the following environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `JPA_DDL_AUTO` | `update` | Auto-creates tables |
| `JPA_SHOW_SQL` | `false` | Disable SQL logging in production |
| `JWT_SECRET` | Generate strong 32+ char key | Use: `openssl rand -base64 32` |
| `JWT_EXPIRATION` | `86400000` | Token expiration in ms (24h) |
| `APP_CORS_ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` | Your deployed frontend URL |
| `APP_WS_ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` | Same as CORS |
| `FIREBASE_CONFIG_PATH` | `/tmp/firebase-key.json` | Set if using Firebase |
| `PORT` | `8080` | Railway auto-sets this |

### 4b. Generate Secure JWT Secret
```bash
# On Windows PowerShell:
$bytes = [System.Text.Encoding]::UTF8.GetBytes((Get-Random))
$base64 = [Convert]::ToBase64String((Get-Random -InputObject (1..32) | ForEach-Object { [byte](Get-Random -Min 0 -Max 256) }))
Write-Host $base64
```

Or use online generator: https://generate-random.org/base64-generator (32+ characters)

---

## Step 5: Configure Your Application

### 5a. Update application.properties for Production

Your current `application.properties` is already configured. Verify:

```properties
# ✅ Already uses environment variables
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/chatconnect}
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:More@2525}

# ✅ JWT from environment
jwt.secret=${JWT_SECRET:replace-with-at-least-32-characters-secret-key}

# ✅ CORS from environment
app.cors.allowed-origins=${APP_CORS_ALLOWED_ORIGINS:http://localhost:5173}
app.ws.allowed-origins=${APP_WS_ALLOWED_ORIGINS:http://localhost:5173}
```

**No changes needed** - all environment variables are properly configured! ✅

### 5b. For Production - Add application-prod.properties

Create: `src/main/resources/application-prod.properties`

```properties
# Production Profile
spring.profiles.active=prod
spring.application.name=chatconnecting

# Database
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.hikari.maximum-pool-size=20

# JPA
spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:validate}
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=false
spring.jpa.properties.hibernate.jdbc.batch_size=20
spring.jpa.properties.hibernate.order_inserts=true

# JWT
jwt.secret=${JWT_SECRET}
jwt.expiration=${JWT_EXPIRATION}

# CORS
app.cors.allowed-origins=${APP_CORS_ALLOWED_ORIGINS}
app.ws.allowed-origins=${APP_WS_ALLOWED_ORIGINS}

# Server
server.port=${PORT:8080}
server.shutdown=graceful
```

### 5c. Update application.properties to Use Production Profile

Add this line to `src/main/resources/application.properties`:

```properties
spring.profiles.active=${SPRING_PROFILES_ACTIVE:local}
```

Then in Railway dashboard, set:
```
SPRING_PROFILES_ACTIVE=prod
```

---

## Step 6: Deploy

### 6a. Trigger Deployment
After pushing to GitHub, Railway automatically detects changes:
1. Watches your GitHub branch
2. Pulls latest code
3. Builds with Maven
4. Creates JAR file
5. Runs Procfile command
6. Starts application

### 6b. Monitor Deployment
1. Go to Railway Dashboard
2. Click your **Spring Boot service**
3. Watch the **Deployments** tab
4. Click latest deployment to see build logs

### 6c. Check Logs
1. Click **Logs** tab
2. Look for "Started ChatconnectingApplication"
3. Should show: `Application 'chatconnecting' is running!`

---

## Step 7: Get Your Railway URL

### 7a. Public URL
1. Go to Spring Boot Service → **Settings**
2. Copy **Public URL** (e.g., `https://chatconnect-prod.up.railway.app`)

### 7b. Update Frontend CORS

In your React frontend, update API base URL:

```javascript
// services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://chatconnect-prod.up.railway.app/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});
```

Update Railway variables for frontend:
```
REACT_APP_API_URL=https://your-railway-backend-url.railway.app/api
```

---

## Step 8: Test Your Deployment

### 8a. Health Check Endpoint
```bash
curl https://your-railway-url.railway.app/actuator/health
```

Expected response:
```json
{"status":"UP"}
```

### 8b. Test Authentication
```bash
# Login
curl -X POST https://your-railway-url.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 8c. Check Database Connection
```bash
# Get users endpoint
curl https://your-railway-url.railway.app/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting Common Errors

### ❌ Error: "Cannot create JDBC Driver"
**Cause:** DB_URL not set correctly
**Fix:**
1. Verify MySQL plugin is added to Railway
2. Check environment variables are set
3. Restart application from Railway dashboard

### ❌ Error: "Deployment failed during build process"
**Cause:** Build process failed
**Fix:**
1. Check logs for exact error
2. Verify Java 17 in system.properties
3. Run locally: `mvn clean package` to test build
4. Check pom.xml dependencies

### ❌ Error: "CORS error" in frontend
**Cause:** APP_CORS_ALLOWED_ORIGINS not set to frontend URL
**Fix:**
1. Get your frontend URL (Vercel, Netlify, etc.)
2. Add to Railway variables: `APP_CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app`
3. Make sure no trailing slash
4. Restart service

### ❌ Error: "Connection refused" from frontend
**Cause:** Frontend doesn't know backend URL
**Fix:**
1. Set frontend environment variable: `REACT_APP_API_URL=https://your-railway-backend.railway.app`
2. Update API service to use this variable
3. Redeploy frontend

### ❌ Error: "No such file: spring-boot-maven-plugin"
**Cause:** Maven plugins not downloaded
**Fix:**
1. Run locally: `mvnw clean package`
2. Verify pom.xml has spring-boot-maven-plugin
3. Check internet connection during build

### ❌ Error: "Port already in use"
**Cause:** PORT environment variable not configured
**Fix:**
1. Railway sets PORT automatically
2. Your Procfile uses: `java -Dserver.port=${PORT}`
3. Verify Procfile is in root directory

---

## Important: Add These to .gitignore

```gitignore
# Environment files
.env
.env.local
.env.*.local

# Firebase keys (never commit!)
firebase-key.json
serviceAccountKey.json

# Build outputs
/target/
/dist/
/node_modules/

# IDE
.idea/
.vscode/
*.iml
```

---

## Step-by-Step Deployment Checklist

- [ ] Push code to GitHub with all new files (Procfile, system.properties, Dockerfile, railway.json)
- [ ] Create Railway account at railway.app
- [ ] Create Railway project connected to GitHub repo
- [ ] Add MySQL plugin to Railway
- [ ] Set all environment variables (JWT_SECRET, CORS, etc.)
- [ ] Check build logs - should say "Build successful"
- [ ] Check application logs - should say "Application started"
- [ ] Test health endpoint with curl
- [ ] Update frontend with Railway backend URL
- [ ] Deploy frontend to connect with Railway backend
- [ ] Test full flow: Login → Chat → Video Call

---

## Railway Service Pricing & Limits

**Free Tier:**
- $5/month free credit
- Great for development and testing
- MySQL included in credit
- Auto-scaling available

**Costs Breakdown (approx):**
- Node.js/Java service: ~$0.50/month (idle), ~$5-10/month (active)
- MySQL database: included in first $5
- Network egress: $0.10 per GB

---

## Next Steps

1. **Push your code with new files to GitHub**
2. **Create Railway project**
3. **Add MySQL plugin**
4. **Set environment variables**
5. **Monitor deployment**
6. **Update frontend URL**
7. **Deploy frontend**
8. **Test full application**

Your Spring Boot backend will be live in ~5-10 minutes!

---

## Support & Resources

- Railway Docs: https://docs.railway.app/
- Spring Boot on Railway: https://docs.railway.app/reference/start-guide
- MySQL Connection: https://docs.railway.app/reference/plugins/mysql
- Environment Variables: https://docs.railway.app/develop/variables


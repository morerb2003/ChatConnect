# Local Testing & Railway Troubleshooting Guide

## Part 1: Test Your Build Locally First

### 1. Clean Build
```bash
cd chatconnecting
mvn clean package
```

**What this does:**
- Removes old build artifacts
- Downloads all dependencies
- Compiles Java code
- Runs tests
- Creates JAR file in target/

**Expected output (last lines):**
```
[INFO] BUILD SUCCESS
[INFO] Total time: 45s
[INFO] Finished at: 2024-04-16T10:30:00Z
[INFO] Final Memory: 180M/512M
```

### 2. Run Locally with Java
```bash
# Navigate to project root
cd chatconnecting

# Run the JAR file
java -jar target/chatconnecting-0.0.1-SNAPSHOT.jar

# Or use Maven to run
mvn spring-boot:run
```

**Expected output:**
```
Started ChatconnectingApplication in 5.234 seconds
=============================================================
Application 'chatconnecting' is running!
Local: http://localhost:8080
Network: http://192.168.x.x:8080
Profiles: [local]
=============================================================
```

### 3. Test with Environment Variables
```bash
# Windows PowerShell
$env:DB_URL = "jdbc:mysql://localhost:3306/chatconnect"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "More@2525"
$env:JWT_SECRET = "your-test-secret-32-chars-long-here-now"
java -jar target/chatconnecting-0.0.1-SNAPSHOT.jar
```

### 4. Test Endpoints Locally
```bash
# Health check
curl http://localhost:8080/actuator/health

# Expected response
{"status":"UP"}

# Test with auth (if no auth required)
curl http://localhost:8080/api/users

# Test with auth (if required)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/users
```

---

## Part 2: Deploy to Railway

### Step 1: Create Railway Account
- Go to https://railway.app
- Sign up with GitHub
- Create new project

### Step 2: Connect GitHub Repository
- Select "Deploy from GitHub repo"
- Authorize Railway to access GitHub
- Select: morerb2003/ChatConnect
- Select branch: rohit-chat-ui

### Step 3: Railway Automatically:
- ✅ Detects Java project (via pom.xml)
- ✅ Sets up Maven build
- ✅ Reads Procfile for startup command
- ✅ Uses system.properties for Java version
- ✅ Builds with: `mvn clean package`

### Step 4: Add MySQL Database
1. Click "+ Add"
2. Search for "MySQL"
3. Click "Add MySQL"
4. Railway creates automatic connection variables:
   - MYSQL_HOST
   - MYSQL_PORT
   - MYSQL_DB
   - MYSQL_USER
   - MYSQL_PASSWORD

### Step 5: Set Environment Variables
Go to Spring Boot Service → Variables → Add:

```
JPA_DDL_AUTO → update
JPA_SHOW_SQL → false
JWT_SECRET → <your-strong-32-char-secret>
JWT_EXPIRATION → 86400000
APP_CORS_ALLOWED_ORIGINS → https://your-frontend.vercel.app
APP_WS_ALLOWED_ORIGINS → https://your-frontend.vercel.app
SPRING_PROFILES_ACTIVE → prod
```

### Step 6: Deploy
- Click "Deploy" button, OR
- Push to GitHub (auto-deploys)

---

## Part 3: Monitor Deployment

### Watch Build Logs
1. Railway Dashboard → Spring Boot Service
2. Click "Deployments" tab
3. Click latest deployment
4. Scroll through "Build Logs"

**Good signs:**
```
✓ Building...
✓ 509 modules transformed
✓ Maven build successful
✓ JAR created in target/
```

### Watch Runtime Logs
1. Click "Logs" tab
2. Look for:
```
Started ChatconnectingApplication in X seconds
=============================================================
Application 'chatconnecting' is running!
Database URL: jdbc:mysql://mysql.railway.internal:3306/chatconnect
=============================================================
```

---

## Part 4: Common Issues & Solutions

### ❌ Issue 1: "Build failed"

**Error Messages:**
```
Could not find a version of 'java' that satisfies the constraints
```

**Cause:** system.properties not recognized

**Fix:**
1. Verify system.properties exists in root:
   ```
   java.runtime.version=17
   maven.version=3.9.0
   ```
2. Commit and push: `git push`
3. Railway rebuilds automatically

---

### ❌ Issue 2: "Cannot create JDBC Driver"

**Error Messages:**
```
java.sql.SQLException: No suitable driver found for jdbc:mysql://...
```

**Causes:**
- MySQL plugin not added
- DB_URL environment variable wrong
- MySQL driver not in dependencies

**Fix:**
1. Check MySQL plugin exists:
   - Go to Railway Dashboard
   - Verify MySQL plugin shows in services
   
2. Verify environment variables:
   - MySQL service → Variables
   - Should show MYSQL_HOST, MYSQL_PORT, etc.
   
3. Restart service:
   - Go to Spring Boot service → Settings
   - Click "Restart"

---

### ❌ Issue 3: "CORS error" on frontend

**Error in Browser Console:**
```
Access to XMLHttpRequest at 'https://...' from origin 'https://your-frontend.com' 
has been blocked by CORS policy
```

**Cause:** APP_CORS_ALLOWED_ORIGINS doesn't match frontend URL

**Fix:**
1. Get your exact frontend URL from Vercel/Netlify
2. Set in Railway:
   - Spring Boot Service → Variables
   - APP_CORS_ALLOWED_ORIGINS=https://your-exact-frontend-url.com
   - (No trailing slash)
3. Restart service
4. Clear browser cache
5. Test again

---

### ❌ Issue 4: "Connection refused" from frontend

**Error:** Frontend can't reach backend

**Cause:** Frontend doesn't know backend URL

**Fix for Frontend:**
1. Get backend URL from Railway:
   - Spring Boot Service → Settings → Domain
   - Copy the URL (e.g., https://chatconnect-prod.railway.app)

2. Update frontend .env:
   ```env
   REACT_APP_API_URL=https://chatconnect-prod.railway.app/api
   REACT_APP_WS_URL=https://chatconnect-prod.railway.app/ws
   ```

3. Update your API service (services/api.js):
   ```javascript
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
   ```

4. Redeploy frontend

---

### ❌ Issue 5: "Port already in use"

**Error:**
```
Address already in use: 8080
```

**Cause:** PORT environment variable not configured

**Fix:**
1. Procfile should use `${PORT}`:
   ```
   web: java -Dserver.port=${PORT} -jar target/*.jar
   ```

2. Railway automatically provides PORT variable

3. If still failing:
   - Check if multiple services running
   - Restart service: Settings → Restart

---

### ❌ Issue 6: "No such file or directory: mvnw"

**Error:**
```
./mvnw: No such file or directory
```

**Cause:** Maven wrapper not in repo

**Fix:**
1. Check files exist:
   - `mvnw` (for Mac/Linux)
   - `mvnw.cmd` (for Windows)
   - `.mvn/wrapper/maven-wrapper.jar`
   - `.mvn/wrapper/maven-wrapper.properties`

2. If missing, regenerate:
   ```bash
   mvn wrapper:wrapper
   git add .mvn mvnw mvnw.cmd
   git commit -m "Add Maven wrapper"
   git push
   ```

---

### ❌ Issue 7: "OutOfMemoryError" during build

**Error:**
```
java.lang.OutOfMemoryError: Java heap space
```

**Cause:** Build process needs more memory

**Fix:**
1. This usually fixes itself on Railway
2. If persistent, try pushing smaller commits
3. Or contact Railway support for higher tier

---

### ❌ Issue 8: Database connection timeout

**Error:**
```
com.mysql.cj.jdbc.exceptions.CommunicationsException: Communications link failure
```

**Cause:** Can't reach MySQL from app

**Possible Fixes:**
1. Wait 1-2 minutes after adding MySQL plugin
2. Check MySQL service is "running" (green status)
3. Verify MYSQL_HOST = `mysql.railway.internal`
4. Restart Spring Boot service

---

## Part 5: Testing Your Live Deployment

### Test 1: Health Check
```bash
# Replace with your URL
curl https://your-railway-url.railway.app/actuator/health

# Should return
{"status":"UP"}
```

### Test 2: Check Database Connection
```bash
# Get users (if endpoint exists)
curl https://your-railway-url.railway.app/api/users

# If requires auth
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-railway-url.railway.app/api/users
```

### Test 3: Full Login Flow
```bash
# 1. Register user
curl -X POST https://your-railway-url.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Login
curl -X POST https://your-railway-url.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. Use token from login response
curl -H "Authorization: Bearer <TOKEN>" \
  https://your-railway-url.railway.app/api/users
```

---

## Part 6: Viewing Railway Logs

### Real-time Logs
1. Dashboard → Select Service
2. Click "Logs" tab
3. Logs stream in real-time
4. Use "Filters" to find errors

### Important Log Messages

**App Starting:**
```
Started ChatconnectingApplication in 5.234 seconds (JVM running for 6.789)
```

**DB Connected:**
```
HikariPool-1 - Starting...
HikariPool-1 - Created connection pool
```

**Listening on Port:**
```
Tomcat started on port(s): 8080 with context path ''
```

### Search Logs for Errors
- Search: `Exception` → Find errors
- Search: `error` → Find specific error messages
- Search: `Started` → Confirm app started
- Search: `Connection` → Check DB connection

---

## Part 7: Database Management

### Access Railway MySQL (Advanced)

**Option 1: Using Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Connect to MySQL
railway database connect
```

**Option 2: Using MySQL Workbench**
1. Railway Dashboard → MySQL Service → Settings
2. Copy connection string
3. Open MySQL Workbench
4. Create new connection with the string

### Common Database Tasks
```sql
-- List all databases
SHOW DATABASES;

-- Use chatconnect database
USE chatconnect;

-- List all tables
SHOW TABLES;

-- Check table structure
DESCRIBE users;

-- Count records
SELECT COUNT(*) FROM users;

-- Clear a table (be careful!)
TRUNCATE TABLE chat_messages;
```

---

## Part 8: Deploy Frontend to Match Backend

### Frontend Environment Variables
Create `.env.production`:
```
REACT_APP_API_URL=https://your-railway-backend-url.railway.app/api
REACT_APP_WS_URL=https://your-railway-backend-url.railway.app/ws
REACT_APP_FIREBASE_CONFIG=<your-firebase-config>
```

### Deploy to Vercel
```bash
cd Frontend
npm install -g vercel
vercel --prod
```

### Deploy to Netlify
1. Push to GitHub
2. Connect repository to Netlify
3. Set environment variables in Netlify dashboard
4. Auto-deploys on push

---

## Part 9: Monitoring & Debugging

### Enable Debug Logging
Add to application-prod.properties:
```properties
logging.level.root=INFO
logging.level.com.chatconnecting=DEBUG
logging.level.org.springframework.security=DEBUG
logging.level.org.hibernate=DEBUG
```

### Add Custom Metrics
```java
@Component
public class ApplicationMetrics {
    @PostConstruct
    public void logStartupInfo() {
        logger.info("✅ Application started with {} active profiles",
            Arrays.toString(environment.getActiveProfiles()));
    }
}
```

---

## Complete Deployment Checklist

- [ ] `mvn clean package` works locally
- [ ] `java -jar target/*.jar` runs without errors
- [ ] Procfile exists and looks correct
- [ ] system.properties specifies Java 17
- [ ] All new files committed to GitHub
- [ ] Pushed to rohit-chat-ui branch
- [ ] Railway project created from GitHub
- [ ] MySQL plugin added
- [ ] All environment variables set
- [ ] Service deployed successfully (green status)
- [ ] Health endpoint returns UP
- [ ] Database connection confirmed in logs
- [ ] Frontend CORS variable set correctly
- [ ] Frontend points to Railway backend URL
- [ ] Full login → chat → video call flow tested


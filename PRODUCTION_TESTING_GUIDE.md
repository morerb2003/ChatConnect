# Railway Production Deployment - Testing Guide

## 🎯 What's Been Configured

### ✅ Backend (Spring Boot on Railway)
- **URL:** https://chatconnect-production.up.railway.app
- **Database:** Railway MySQL (yamanote.proxy.rlwy.net:32165)
- **CORS:** Enabled for localhost and Railway frontend
- **WebSocket:** Configured for wss:// connections

### ✅ Frontend Configuration
- **API URL:** https://chatconnect-production.up.railway.app/api
- **WebSocket URL:** wss://chatconnect-production.up.railway.app/ws
- **Environment:** .env.production created

### ✅ Files Configured
- `Frontend/.env.production` ← Frontend API URLs
- `chatconnecting/src/main/java/com/chatconnecting/config/CorsConfig.java` ← CORS policy
- `chatconnecting/src/main/resources/application.properties` ← Backend URLs

---

## 🚀 Step 1: Rebuild Backend on Railway

Your backend needs to rebuild with the new configuration:

1. **Railway Dashboard** → Spring Boot Service
2. Click **Settings**
3. Click **Redeploy** button
4. Watch **Deployments** tab (should take 2-3 minutes)
5. Check **Logs** tab for:
   ```
   Started ChatconnectingApplication in X seconds
   Application 'chatconnecting' is running!
   ```

---

## 🧪 Step 2: Test Backend Health

Open in browser or use curl:

```bash
# Health check
curl https://chatconnect-production.up.railway.app/actuator/health

# Expected response:
{"status":"UP"}
```

---

## 🧪 Step 3: Test Database Connection

Check backend logs for successful database connection. In Railway:

1. **Spring Boot Service → Logs**
2. Look for:
   ```
   HikariPool-1 - Successfully connected to jdbc:mysql://yamanote.proxy.rlwy.net:32165/railway
   ```

If you see this, database is working! ✅

---

## 🧪 Step 4: Build Frontend for Production

Now rebuild your React frontend with the new environment variables:

```bash
cd Frontend
npm run build
```

This will use `.env.production` with the Railway URLs.

---

## 🧪 Step 5: Test Frontend Locally (Optional)

Before deploying frontend, test locally:

```bash
# Use production env variables locally
set VITE_API_URL=https://chatconnect-production.up.railway.app/api
set VITE_WS_URL=wss://chatconnect-production.up.railway.app/ws

# Run dev server
npm run dev

# Open browser: http://localhost:5173
```

**Test these in browser console:**

```javascript
// Should connect to Railway backend
import api from './src/services/api.js'
api.get('/auth/users')  // or any endpoint
```

---

## 📝 Step 6: Manual API Tests

### Test Authentication

**Register a new user:**
```bash
curl -X POST https://chatconnect-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

**Login:**
```bash
curl -X POST https://chatconnect-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Test with JWT Token

```bash
# Get token from login above, then:
curl -X GET https://chatconnect-production.up.railway.app/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔗 Step 7: Deploy Frontend

### Option A: Deploy to Vercel

```bash
cd Frontend
npm run build
npx vercel deploy
```

Set environment variables in Vercel:
```
VITE_API_URL=https://chatconnect-production.up.railway.app/api
VITE_WS_URL=wss://chatconnect-production.up.railway.app/ws
```

### Option B: Deploy to Netlify

```bash
cd Frontend
npm run build
netlify deploy --prod --dir=dist
```

Set environment variables in Netlify dashboard:
```
VITE_API_URL=https://chatconnect-production.up.railway.app/api
VITE_WS_URL=wss://chatconnect-production.up.railway.app/ws
```

---

## ✅ Step 8: End-to-End Testing

Once frontend is deployed, test these flows:

### Test 1: User Registration
1. Open your deployed frontend
2. Go to Register page
3. Create new account
4. Should see success message

### Test 2: User Login
1. Go to Login page
2. Enter credentials
3. Should redirect to dashboard
4. JWT token should be in browser localStorage

### Test 3: Real-time Chat
1. Open two browser windows
2. Login with two different users
3. Send a message
4. Message should appear instantly (WebSocket)
5. Check browser console for WebSocket connection: `wss://chatconnect-production.up.railway.app/ws`

### Test 4: Video Call (if implemented)
1. Open two browser windows
2. Login with two users
3. Initiate a call
4. Should see video connection
5. Check Network tab for WebRTC connections

### Test 5: File Upload
1. Try uploading a profile picture
2. Should upload to Railway backend
3. File should be accessible

---

## 🔍 Troubleshooting

### ❌ Frontend can't connect to backend

**Symptoms:** CORS error in browser console

**Check:**
1. Backend is deployed and running (test health endpoint)
2. `.env.production` has correct URLs (no trailing slash)
3. CORS config in backend includes your frontend URL
4. Restart backend: Settings → Restart

**Fix:**
```
Backend CORS Config needs:
- http://localhost:5173 (if testing locally)
- https://your-frontend-url.com (if deployed)
```

---

### ❌ WebSocket connection fails

**Symptoms:** 
```
WebSocket connection failed
wss://chatconnect-production.up.railway.app/ws: 403 Forbidden
```

**Check:**
1. WebSocketConfig.java includes frontend URL in allowed origins
2. Backend is redeployed after config change
3. JWT token is valid

**Fix:**
Restart backend service in Railway

---

### ❌ Database queries fail

**Symptoms:**
```
Cannot connect to database
java.sql.SQLException: ...
```

**Check in Railway:**
1. MySQL service shows "Running" (green status)
2. Database URL: `yamanote.proxy.rlwy.net:32165`
3. Credentials are correct
4. Check backend logs

**Fix:**
1. Verify MYSQL_HOST environment variable
2. Restart backend service
3. Wait 1-2 minutes after restarting

---

### ❌ 401 Unauthorized errors

**Symptoms:**
```
{"error": "Unauthorized"}
```

**Check:**
1. JWT token is being sent in header
2. Token hasn't expired
3. JWT_SECRET matches between environments

**Fix:**
1. Login again to get new token
2. Include token in Authorization header:
   ```
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

---

## 📊 Monitoring

### Check Backend Logs

```
Railway Dashboard 
→ Spring Boot Service 
→ Logs tab
```

Look for:
- ✅ Application startup success
- ✅ Database connections
- ✅ WebSocket connections
- ❌ Error messages

### Check Request Metrics

```
Railway Dashboard
→ Spring Boot Service
→ Metrics tab
```

Monitor:
- Request count
- Error rate
- Response time

---

## 🎯 Success Checklist

- [ ] Backend deployed on Railway (status: running)
- [ ] Health endpoint returns UP
- [ ] Database connection successful (in logs)
- [ ] Frontend built with .env.production
- [ ] Frontend deployed to Vercel/Netlify
- [ ] User registration works
- [ ] User login works
- [ ] JWT token is issued
- [ ] Chat messages work in real-time
- [ ] WebSocket connection established
- [ ] No CORS errors in console
- [ ] File uploads work
- [ ] Video calls work (if implemented)

---

## 🚀 You're Live!

Your full-stack app is now deployed on Railway with:
- ✅ Spring Boot backend on Railway
- ✅ MySQL database on Railway
- ✅ React frontend on Vercel/Netlify
- ✅ Real-time communication via WebSocket
- ✅ Secure JWT authentication
- ✅ CORS properly configured

Celebrate! 🎉

---

## Next Steps

1. **Monitor production** - Check logs regularly
2. **Set up alerts** - Monitor backend errors
3. **Enable HTTPS** - Already done on Railway
4. **Backup database** - Set up Railway backups
5. **Add logging** - Track important events
6. **Performance testing** - Load test your app

---

## Support

- Railway Docs: https://docs.railway.app
- Spring Boot Docs: https://spring.io/projects/spring-boot
- React/Vite Docs: https://vitejs.dev
- Get help: Check backend logs first!

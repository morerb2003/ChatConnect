# Railway Deployment - Next Steps (IMMEDIATE ACTIONS)

## ✅ What I've Fixed

| Item | Status | Details |
|------|--------|---------|
| Deleted `railway.json` | ✅ DONE | Removed conflicting build configuration |
| Updated `application.properties` | ✅ DONE | Added production-ready settings |
| Pushed to GitHub | ✅ DONE | Changes are on `rohit-chat-ui` branch |
| MySQL Driver | ✅ OK | Already in pom.xml (mysql-connector-j) |
| Procfile | ✅ OK | No changes needed |
| system.properties | ✅ OK | No changes needed |

---

## 🚀 What You Need to Do NOW (5 Steps, ~10 minutes)

### Step 1: Create Railway Project (2 minutes)
1. Go to **https://railway.app/dashboard**
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose repository: **`morerb2003/ChatConnect`**
6. Choose branch: **`rohit-chat-ui`** (your current branch)
7. Click **"Deploy"**

**Railway will automatically:**
- ✅ Detect Java (via pom.xml)
- ✅ Build with Maven
- ✅ Use Java 17 (via system.properties)
- ✅ Run using Procfile

**Expected time:** 2-5 minutes for first build

---

### Step 2: Add MySQL Database (1 minute)
1. In Railway dashboard, go to your **Spring Boot service**
2. Click **"+ Add"** button
3. Search and click **"MySQL"**
4. Click **"Add MySQL"**
5. Wait for provisioning (20 seconds)

**Railway auto-creates these variables:**
- MYSQL_HOST
- MYSQL_PORT
- MYSQL_DB
- MYSQL_USER
- MYSQL_PASSWORD

---

### Step 3: Set Environment Variables (3 minutes)

Go to **Spring Boot Service → Variables** and add these:

| Variable | Value |
|----------|-------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JPA_DDL_AUTO` | `update` |
| `JPA_SHOW_SQL` | `false` |
| `JWT_SECRET` | Generate random 32+ chars (use: https://generate-random.org/base64-generator) |
| `JWT_EXPIRATION` | `86400000` |
| `APP_CORS_ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` |
| `APP_WS_ALLOWED_ORIGINS` | `https://your-frontend-url.vercel.app` |

**Important:** Replace frontend URLs with your actual Vercel/Netlify URL (no trailing slash!)

---

### Step 4: Redeploy (1 minute)

1. Click **Settings** → **Redeploy**
2. Watch the **Deployments** tab
3. Once green ✅, click **Logs** tab
4. Look for: `Started ChatconnectingApplication in X seconds`

---

### Step 5: Update Frontend (1 minute)

Once backend is running:

**File:** `Frontend/.env.production`
```env
VITE_API_URL=https://chatconnect-prod.railway.app/api
VITE_WS_URL=wss://chatconnect-prod.railway.app/ws
```

Replace `chatconnect-prod.railway.app` with your actual Railway domain!

---

## 📋 Verification Checklist

After deployment:

- [ ] Backend URL is accessible (check in Railway Settings → Domains)
- [ ] Health check works: `curl https://your-url/actuator/health`
- [ ] Logs show "Application running"
- [ ] MySQL status is green
- [ ] Frontend can reach backend
- [ ] WebSocket connection works
- [ ] Can register/login users

---

## 🆘 If Something Goes Wrong

### Error: "Build failed"
- Delete `railway.json` ✅ (already done)
- Check Procfile exists ✅
- Check system.properties exists ✅
- Redeploy in Railway

### Error: "Database connection failed"
- Check MySQL plugin shows "Running" (green)
- Wait 1-2 minutes after adding MySQL
- Verify `MYSQL_HOST=mysql.railway.internal` in logs
- Restart service

### Error: "CORS error from frontend"
- Check frontend URL is exactly correct (no trailing slash)
- Set both `APP_CORS_ALLOWED_ORIGINS` and `APP_WS_ALLOWED_ORIGINS`
- Clear browser cache
- Restart service

---

## 📖 Full Details

For complete step-by-step guide with explanations, see: **RAILWAY_COMPLETE_SETUP.md**

---

## 🎯 Timeline

| Step | Time | Status |
|------|------|--------|
| 1. Create Railway Project | 2-5 min | ⏳ Your turn |
| 2. Add MySQL | 1 min | ⏳ Your turn |
| 3. Set Variables | 3 min | ⏳ Your turn |
| 4. Redeploy | 1 min | ⏳ Your turn |
| 5. Update Frontend | 1 min | ⏳ Your turn |
| **Total** | **~15 min** | ⏳ |

---

## Questions?

Refer to the full guide: **RAILWAY_COMPLETE_SETUP.md** in the root directory for:
- Detailed explanations
- Alternative solutions
- Troubleshooting guide
- Production best practices

Ready to deploy! 🚀

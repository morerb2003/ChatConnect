# 🚨 URGENT: Complete Deployment Fix Guide

## Problems You're Experiencing

✗ "Reconnecting..." message showing  
✗ WebSocket error: "wss: is not allowed"  
✗ CORS error on `/api/chat/rooms/2`  
✗ Messages not sending  
✗ Users show as online but UI not updating  

---

## Root Cause

Your fixes were **committed to GitHub** but **NOT YET DEPLOYED**. The app is still running the old code!

---

## 🚀 STEP-BY-STEP FIX (Follow Exactly)

### STEP 1: Redeploy Backend on Railway (MOST CRITICAL) ⏱️ 5 minutes

1. **Go to:** https://railway.app/dashboard
2. **Click:** Your Spring Boot Service
3. **Click:** Settings tab
4. **Click:** **Redeploy** button
5. **Wait:** Green ✅ status (2-3 minutes)
6. **Check Logs:** Should see:
   ```
   Registering STOMP endpoint /ws with allowed origins=http://localhost:5173,https://chat-connect-ochre.vercel.app,https://chatconnect-production.up.railway.app
   ```

**DO NOT proceed until this shows green ✅**

---

### STEP 2: Rebuild & Redeploy Frontend (VERCEL) ⏱️ 3 minutes

**Option A: Using Vercel CLI**
```bash
cd Frontend
npm run build
npx vercel deploy --prod
```

**Option B: Using Vercel Dashboard**
1. Go to https://vercel.com
2. Click your ChatConnect project
3. Go to **Settings** → **Git**
4. Click **Redeploy** under "Deployment History"
5. Wait for green ✅ status

**Result:** Frontend should now use the fixed `https://` WebSocket URL (not `wss://`)

---

### STEP 3: Clear Browser Cache (VERY IMPORTANT!) ⏱️ 1 minute

Your browser is caching the old code!

**Chrome:**
1. Press: `Ctrl + Shift + Delete`
2. Select: "All time"
3. Check: "Cached images and files"
4. Click: "Clear data"

**OR Hard Refresh:**
- Press: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
- This bypasses cache for current page

---

### STEP 4: Test the Fixes ⏱️ 2 minutes

1. **Open:** https://chat-connect-ochre.vercel.app
2. **Reload:** Page (or F5)
3. **Check Status:**
   - Should say **"Welcome, Rohit More"** (not "Reconnecting...")
   - Should NOT show "wss: is not allowed" error
   - Should NOT show CORS errors

4. **Test Real-Time Chat:**
   - Open DevTools: `F12` → Console
   - Look for: `[WebSocket] Connected` (or similar success message)
   - Send a message to another user
   - Should appear **instantly** (no reload needed)

---

## 🔍 Verification Checklist

After deploying, verify these:

| Check | Expected | Status |
|-------|----------|--------|
| **Connection Status** | "Online" or "Welcome" (not "Reconnecting...") | ✓ |
| **Console Errors** | NO "wss:" or "CORS" errors | ✓ |
| **WebSocket Connection** | Network tab shows `wss://` to `/ws` endpoint | ✓ |
| **Message Sending** | Message appears instantly in other browser | ✓ |
| **User Presence** | Other users show "Online" status | ✓ |
| **Message History** | Can see past messages from chat | ✓ |

---

## 📊 What Was Fixed

### **Before (Broken)** ❌
```
Frontend:
- VITE_WS_URL = wss://... (SockJS rejects this!)

Backend CORS:
- app.ws.allowed-origins = wss://... (doesn't match browser origin!)

Result: WebSocket fails, messages don't sync
```

### **After (Fixed)** ✅
```
Frontend:
- VITE_WS_URL = https://... (SockJS accepts this)
- SockJS auto-upgrades to wss://

Backend CORS:
- app.ws.allowed-origins = https://... (matches browser origin)
- WebSocket handshake succeeds

Result: Real-time chat works!
```

---

## 🚨 If Still Having Issues

### Issue: Still Showing "Reconnecting..."

**Check 1: Backend Really Redeployed?**
```bash
# Test health endpoint
curl https://chatconnect-production.up.railway.app/actuator/health

# Should return: {"status":"UP"}
```

If this fails:
1. Backend might still be building
2. Wait another 1-2 minutes
3. Refresh Railway dashboard to see actual status

**Check 2: Browser Cache**
- Hard refresh again: `Ctrl + Shift + R`
- Clear all browser cache
- Quit browser completely and reopen

**Check 3: Frontend Actually Redeployed?**
- Go to https://chat-connect-ochre.vercel.app
- Open DevTools: `F12`
- Network tab → find any request to your backend
- Check `VITE_WS_URL` value

---

### Issue: CORS Error Still Showing

**Symptom:** `Access to XMLHttpRequest... CORS policy... blocked`

**Fix:**
1. Check backend logs for:
   ```
   Registering STOMP endpoint /ws with allowed origins=...
   ```
   Should include `https://chat-connect-ochre.vercel.app`

2. If NOT there, backend not redeployed yet
3. If YES but still CORS error:
   - Clear browser cache
   - Hard refresh
   - Test again

---

### Issue: WebSocket Connection Fails

**Symptom:** Network tab shows failed WebSocket connection

**Fix:**
1. Check Console for error message
2. Look for "Origin header mismatch"
3. Verify backend has correct origins in logs
4. Restart browser completely

---

## 📱 Test Messages Are Syncing

### Test 1: Same Browser, Different Tabs
1. Open https://chat-connect-ochre.vercel.app in Tab 1
2. Open same URL in Tab 2
3. In Tab 1, send a message
4. **Should instantly appear in Tab 2** (not after page reload)

### Test 2: Different Browsers
1. Chat with another user
2. Send message from your browser
3. Check if other user sees it **instantly**
4. Other user replies
5. **You should see reply instantly** (real-time)

---

## ✅ Success Signs

Everything is working when you see:

1. ✅ No "Reconnecting..." status
2. ✅ No "wss: is not allowed" error
3. ✅ No CORS policy errors
4. ✅ Messages appear instantly (no reload needed)
5. ✅ Other users' presence updates in real-time
6. ✅ Typing indicators show
7. ✅ Message delivery status shows
8. ✅ Can start new chats

---

## 🎯 Timeline

| Step | Action | Time | Status |
|------|--------|------|--------|
| 1 | Redeploy Backend on Railway | 5 min | ⏳ Do this FIRST |
| 2 | Rebuild Frontend | 1 min | ⏳ Then this |
| 3 | Redeploy to Vercel | 2 min | ⏳ Then this |
| 4 | Clear Browser Cache | 1 min | ⏳ Critical step |
| 5 | Test Everything | 2 min | ⏳ Verify fixes |
| **TOTAL** | | **~15 min** | ⏳ |

---

## 🆘 Still Stuck?

1. **Screenshot browser console** with any error
2. **Check Railway logs** for error messages
3. **Verify all 3 deployments** completed successfully:
   - ✅ Backend redeployed on Railway
   - ✅ Frontend rebuilt locally
   - ✅ Frontend deployed to Vercel

4. **Wait 2-3 minutes** if you just redeployed
5. **Hard refresh** browser cache

---

## 📞 Debug Info to Collect

If something's wrong, check:

```javascript
// In browser console:
console.log("API URL:", import.meta.env.VITE_API_URL)
console.log("WS URL:", import.meta.env.VITE_WS_URL)

// Expected output:
// API URL: https://chatconnect-production.up.railway.app/api
// WS URL: https://chatconnect-production.up.railway.app/ws  (NOT wss://)
```

---

## ✨ After This Works

Your app will have:
- ✅ Real-time messaging (messages sync instantly)
- ✅ User presence (see who's online)
- ✅ Video calls (WebSocket signaling works)
- ✅ Typing indicators
- ✅ Message delivery status
- ✅ Full production-ready chat

---

## Quick Reference

**All Allowed Origins:**
```
http://localhost:5173        (local dev)
https://chat-connect-ochre.vercel.app  (your Vercel frontend)
https://chatconnect-production.up.railway.app  (Railway frontend)
```

**All URLs Must Use:**
- `https://` (never `wss://` in config)
- No trailing slashes
- Exact URLs (case sensitive)

---

**DO THIS NOW:** Redeploy backend on Railway → Clear cache → Test!

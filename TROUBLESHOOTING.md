# Troubleshooting Connection Issues

## Common Error Messages and Solutions

### "User not found on server. They need to be connected first."

**Cause:** The other user hasn't registered their public key yet.

**Solution:**
1. Make sure BOTH users have the app open
2. Both users need to wait a few seconds for their keys to register
3. Try sharing the public key again
4. Check browser console for `[Client] Public key registered` message

### "Failed to find user on server"

**Cause:** Network error or the user isn't registered.

**Solution:**
1. Refresh both browser windows
2. Make sure both users are on the same deployment URL
3. Check browser console for errors
4. Try again after a few seconds

### "Failed to connect to server. Please check your connection."

**Cause:** Network error or API endpoint issue.

**Solution:**
1. Check your internet connection
2. Open browser console (F12) and check for errors
3. Try refreshing the page
4. Check if the API endpoints are working (look for errors in Network tab)

### "Failed to register with server. Please refresh."

**Cause:** Server-side error during key registration.

**Solution:**
1. Refresh the page
2. Check server logs for errors
3. If using Redis, verify environment variables are set correctly
4. Check browser console for detailed error messages

## Debugging Steps

### 1. Check Browser Console

Open browser console (F12) and look for:
- `[Client]` messages - shows client-side activity
- `[Storage]` messages - shows storage type (Redis or in-memory)
- Any red error messages

### 2. Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try connecting again
4. Look for `/api/keys` requests:
   - Check if they return 200 status
   - Check the response data

### 3. Check Server Logs

If deployed on Vercel/Netlify:
1. Go to your deployment dashboard
2. Check function logs
3. Look for `[KEYS POST]`, `[KEYS GET]`, or `[Storage]` messages

### 4. Verify Redis Setup (if using)

1. Check environment variables are set:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
2. Check server logs for `[Storage] Using Redis for persistence`
3. If you see `[Storage] Redis not configured`, Redis isn't set up

## Quick Fixes

### Fix 1: Clear Browser Storage

1. Open browser console (F12)
2. Go to Application/Storage tab
3. Clear LocalStorage
4. Refresh the page
5. Try connecting again

### Fix 2: Both Users Refresh

1. Both users should refresh their browsers
2. Wait 5 seconds for keys to register
3. Try connecting again

### Fix 3: Check Deployment

1. Make sure you're on the same deployment URL
2. If using different URLs, they won't be able to connect
3. Both users must be on the exact same domain

### Fix 4: Without Redis (Quick Test)

If Redis isn't set up:
1. Both users must connect within seconds of each other
2. The server must stay "warm" (recently used)
3. Data will be lost on server restart

**For production, set up Redis!**

## Still Not Working?

1. **Share the exact error message** you see
2. **Check browser console** and share any errors
3. **Check server logs** and share relevant messages
4. **Describe what happens** step by step when you try to connect

## Testing Locally

To test if it works:

1. Run `pnpm dev`
2. Open two browser windows (or use incognito for second)
3. Both should connect automatically
4. If it works locally but not in production, it's likely a Redis/storage issue


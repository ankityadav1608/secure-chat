# Deployment Guide for Secure Chat

## Quick Deploy Options

### Option 1: Vercel (Recommended for Next.js)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository
   - Click "Deploy"
   - Your app will be live at `https://your-app.vercel.app`

3. **Share your public key**
   - Open the deployed app
   - Copy your public key or share the QR code
   - Share the link with anyone you want to chat with

### Option 2: Netlify

1. **Build the app**
   ```bash
   pnpm build
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `.next` folder, or
   - Connect your GitHub repo for automatic deployments

### Option 3: Self-Hosted (VPS/Server)

1. **Build the app**
   ```bash
   pnpm install
   pnpm build
   ```

2. **Start the production server**
   ```bash
   pnpm start
   ```

3. **Use a process manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start npm --name "secure-chat" -- start
   pm2 save
   pm2 startup
   ```

4. **Set up reverse proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## How to Use After Deployment

1. **User A (You)**
   - Open the deployed app URL
   - Your public key will be generated automatically
   - Click "Show QR Code" or "Copy Shareable Link"
   - Share the QR code or link with User B

2. **User B (Friend)**
   - Open the shareable link, OR
   - Open the app and click "Add Friend's Key"
   - Paste User A's public key
   - Wait for secure connection to establish

3. **Start Chatting**
   - Once both users see "Secure connection established"
   - Messages are end-to-end encrypted
   - Only you and your friend can read them

## Important Notes

### Current Limitations

⚠️ **In-Memory Storage**: The app uses in-memory storage, which means:
- Data is lost when the server restarts
- Won't work with multiple server instances (load balancing)
- Each server restart creates a fresh state

### For Production Use

For a production-ready deployment, consider:

1. **Add a Database** (PostgreSQL, MongoDB, etc.)
   - Store public keys persistently
   - Store messages temporarily (they're encrypted anyway)

2. **Add Redis** (for multi-instance deployments)
   - Share state across multiple server instances
   - Better for load-balanced setups

3. **Add Authentication** (optional)
   - User accounts
   - Persistent chat history
   - Multiple conversations

4. **Add WebSocket Support**
   - Real-time messaging instead of polling
   - Better performance and lower latency

## Environment Variables

Currently, no environment variables are required. For production, you might want to add:

```env
NODE_ENV=production
PORT=3000
# Add database connection strings if you implement persistence
```

## Security Considerations

✅ **What's Secure:**
- End-to-end encryption (RSA + AES)
- Keys never leave the client (except public keys)
- Messages are encrypted before sending
- Server cannot read messages

⚠️ **What to Consider:**
- Use HTTPS in production (Vercel/Netlify do this automatically)
- Consider rate limiting for API endpoints
- Add input validation and sanitization
- Consider adding message expiration

## Troubleshooting

**Connection Issues:**
- Make sure both users are on the same server instance
- Clear browser cache and try again
- Check browser console for errors

**Key Exchange Fails:**
- Ensure both users have registered their public keys
- Try refreshing the page
- Share the public key again

**Messages Not Decrypting:**
- Make sure secure connection is established (green indicator)
- Try re-establishing the connection
- Check that you're using the correct public key

## Support

For issues or questions, check the browser console for detailed error messages.


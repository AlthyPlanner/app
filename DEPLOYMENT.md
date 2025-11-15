# Deployment Guide - Vercel

This guide will help you deploy your React frontend to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your backend deployed (Railway, Render, or another service)
3. Your domain ready (optional, but recommended)

## Method 1: Deploy via Vercel CLI (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

If you get permission errors, use:
```bash
npm install -g vercel --prefix ~/.npm-global
# Then add to your PATH: export PATH="$HOME/.npm-global/bin:$PATH"
```

Or use npx (no installation needed):
```bash
npx vercel
```

### Step 2: Navigate to Client Directory

```bash
cd client
```

### Step 3: Deploy

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No (first time)
- **Project name?** → `althyplanner` (or your choice)
- **Directory?** → `./` (current directory)
- **Override settings?** → No

### Step 4: Production Deployment

For production deployment:
```bash
vercel --prod
```

## Method 2: Deploy via GitHub (Easier)

### Step 1: Push to GitHub

```bash
cd /Users/njit/Documents/personal/althyplanner
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `client`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `build` (auto-detected)
5. Click "Deploy"

## Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add:
```
REACT_APP_API_URL=https://your-backend-url.com
```

**Important:** Replace `your-backend-url.com` with your actual backend URL (e.g., `https://althyplanner-api.railway.app`)

After adding, redeploy:
- Go to Deployments tab
- Click the three dots on latest deployment
- Click "Redeploy"

## Step 4: Connect Your Domain

### In Vercel Dashboard:

1. Go to **Settings** → **Domains**
2. Enter your domain: `althyplanner.com`
3. Follow DNS instructions:
   - Add an **A record** pointing to Vercel's IP
   - Or add a **CNAME** record pointing to your Vercel URL
4. Wait for DNS propagation (5-60 minutes)

### DNS Configuration Example:

**Option A: A Record (Root Domain)**
```
Type: A
Name: @
Value: 76.76.21.21 (Vercel's IP - check Vercel dashboard for current IP)
```

**Option B: CNAME (Subdomain)**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Step 5: Update Backend CORS

Update your backend's CORS configuration to allow your Vercel domain:

In `server/src/index.js`:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));
```

Set environment variable in your backend:
```
FRONTEND_URL=https://althyplanner.com
```

## Step 6: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your OAuth 2.0 Client
3. Add authorized redirect URIs:
   - `https://althyplanner.com/auth/google/callback`
   - `https://www.althyplanner.com/auth/google/callback` (if using www)

## Verification

After deployment, verify:
- ✅ `https://althyplanner.com` → Shows landing page
- ✅ `https://althyplanner.com/app` → Shows your React app
- ✅ API calls work (check browser console for errors)
- ✅ Google OAuth works (if configured)

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel auto-detects)

### API Calls Fail
- Check `REACT_APP_API_URL` environment variable
- Verify backend CORS settings
- Check backend is running and accessible

### Routing Issues
- Verify `vercel.json` is in `client/` directory
- Check that `homepage: "/"` is in `package.json`

### Domain Not Working
- Wait for DNS propagation (can take up to 48 hours)
- Verify DNS records are correct
- Check domain in Vercel dashboard shows "Valid Configuration"

## Continuous Deployment

Once connected to GitHub, Vercel will automatically deploy:
- Every push to `main` branch → Production
- Every push to other branches → Preview deployment

## Next Steps

1. Deploy your backend (Railway, Render, or similar)
2. Update `REACT_APP_API_URL` in Vercel
3. Update backend CORS settings
4. Test all features
5. Monitor Vercel dashboard for errors


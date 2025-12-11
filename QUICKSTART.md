# Quick Start: Deploy to Vercel

Get your WebsiteBio AI Image Generator live in 5 minutes!

## Prerequisites

- GitHub account with your repository
- Vercel account (free at https://vercel.com)
- WhomeAI API key (demo key: `sk-demo`)

## Step 1: Push to GitHub (2 minutes)

```bash
cd /path/to/websitebio
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

## Step 2: Connect to Vercel (1 minute)

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select your GitHub repository
4. Click "Import"

**Vercel automatically detects** `vercel.json` and configures everything!

## Step 3: Set Environment Variables (1 minute)

1. After import, go to "Settings" → "Environment Variables"
2. Add new variable:
   - **Name**: `WHOMEAI_API_KEY`
   - **Value**: `sk-demo` (or your API key)
   - **Environments**: Select all (Production, Preview, Development)
3. Click "Save"

## Step 4: Deploy (1 minute)

1. Click "Deploy" button
2. Wait 1-2 minutes for deployment to complete
3. Visit your site at: `https://your-project.vercel.app`

## That's it! 🎉

Your site is now live!

### What was configured automatically:

✅ Static site hosting  
✅ Serverless API function  
✅ HTTPS/SSL  
✅ CDN caching  
✅ Security headers  
✅ Automatic deployments on GitHub push  

## Next Steps

### Test the deployment:

1. Visit your Vercel URL
2. Enter a prompt: "A colorful abstract art piece"
3. Click "Generate Images"
4. Verify images appear without errors

### Enable automatic deployments:

Every time you push to `main` branch, Vercel automatically deploys:

```bash
# Make changes locally
git add .
git commit -m "Update UI"
git push origin main

# Vercel deploys automatically!
# Check deployment status at vercel.com/dashboard
```

### Configure custom domain (optional):

1. In Vercel dashboard → "Settings" → "Domains"
2. Add your domain (e.g., `websitebio.com`)
3. Follow DNS configuration instructions
4. SSL certificate auto-provisioned

## Troubleshooting

### Images not generating?

Check that:
1. ✓ Environment variable `WHOMEAI_API_KEY` is set
2. ✓ Wait a few minutes for variable propagation
3. ✓ Try redeploying: "Deployments" → Click latest → "Promote to Production"

### How to view logs?

```bash
# Install Vercel CLI
npm install -g vercel

# View function logs
vercel logs https://your-project.vercel.app --follow
```

### Reset or redeploy?

1. In Vercel dashboard → "Deployments"
2. Find the deployment you want
3. Click "Promote to Production"

## Development Workflow

```bash
# 1. Clone the repo
git clone https://github.com/your-username/websitebio.git
cd websitebio

# 2. Run locally for testing
python3 -m http.server 8000
# Visit http://localhost:8000

# 3. Make changes
# Edit files...

# 4. Push to GitHub
git add .
git commit -m "Your changes"
git push origin main

# 5. Vercel deploys automatically!
# Check status: https://vercel.com/dashboard
```

## File Reference

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel configuration (auto-detected) |
| `api/generateImages.js` | Serverless function for API requests |
| `.env.example` | Template for environment variables |
| `config.js` | Frontend configuration |
| `script.js` | Main application logic |
| `DEPLOYMENT.md` | Detailed deployment guide |
| `ENVIRONMENT.md` | Environment variable guide |
| `TESTING.md` | Testing guide |

## Key Features

### Secure API Key Handling
- API key stored in Vercel secrets
- Never exposed to frontend
- Proxied through serverless function

### Automatic Deployments
- Push to `main` → Production deployment
- Create PR → Preview deployment
- All with SSL and CDN

### Performance Optimized
- Static site hosting
- Edge caching
- Optimized images
- Fast API responses

## Support

- 📖 Full guide: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🔧 Environment variables: See [ENVIRONMENT.md](./ENVIRONMENT.md)
- ✅ Testing: See [TESTING.md](./TESTING.md)
- 🌐 Vercel docs: https://vercel.com/docs
- 🤖 WhomeAI API: https://whomeai.com/docs

## Common Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Link project to Vercel account
vercel link

# Deploy to production
vercel --prod

# View environment variables
vercel env ls

# Add environment variable
vercel env add WHOMEAI_API_KEY

# View logs
vercel logs <deployment-url>

# Redeploy specific version
vercel deploy <commit-hash> --prod
```

---

**Congratulations!** Your WebsiteBio AI Image Generator is now deployed to Vercel! 🚀

For questions or issues, refer to the detailed guides:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variable guide
- [TESTING.md](./TESTING.md) - Testing and verification guide

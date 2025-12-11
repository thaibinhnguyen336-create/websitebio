# Vercel Deployment Guide

This guide explains how to deploy the WebsiteBio AI Image Generator to Vercel.

## Prerequisites

- GitHub account with repository access
- Vercel account (free tier available at https://vercel.com)
- WhomeAI API key (demo key: `sk-demo`)

## Step 1: Prepare Your Repository

Make sure all files are committed to your GitHub repository:

```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

## Step 2: Connect to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Select your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Other (since this is a static site)
   - **Root Directory**: `./` (default)
   - **Build Command**: Leave empty or use `echo 'Static site, no build required'`
   - **Output Directory**: `./`

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project directory
vercel
```

## Step 3: Set Environment Variables

### In Vercel Dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
Name: WHOMEAI_API_KEY
Value: sk-demo  (or your actual API key)
Environments: Production, Preview, Development
```

### Via Vercel CLI:

```bash
vercel env add WHOMEAI_API_KEY
# Enter value: sk-demo
```

## Step 4: Configure Automatic Deployments

### GitHub Integration (Automatic)

Once connected, Vercel automatically deploys when you:
- Push to the `main` branch (production deployment)
- Create pull requests (preview deployments)
- Push to any other branch (staging deployments)

To customize:
1. Go to project "Settings" → "Git"
2. Configure which branches trigger deployments
3. Enable/disable preview deployments

## Step 5: Verify Configuration

After deployment, verify:

1. **Site is accessible**
   - Visit your Vercel URL (e.g., `https://websitebio.vercel.app`)
   - Check that all assets load correctly

2. **API Integration works**
   - Generate a test image
   - Check browser console for any errors
   - Verify images are generated successfully

3. **Security**
   - API key is not exposed in client code
   - Environment variables are properly loaded
   - HTTPS is enabled (automatic with Vercel)

4. **Performance**
   - Images load and display smoothly
   - No console errors
   - Check Vercel Analytics for performance metrics

## Step 6: Configure Custom Domain (Optional)

1. Go to project "Settings" → "Domains"
2. Add your custom domain
3. Update DNS records (Vercel provides instructions)
4. SSL certificate is automatically provisioned

## Monitoring & Logging

### View Deployment Logs

```bash
# Using Vercel CLI
vercel logs [deployment-url]
```

### Check Function Logs

1. Go to "Deployments" in project
2. Click on a deployment
3. View "Functions" tab for API logs

### Performance Metrics

1. Go to "Analytics" tab
2. Monitor:
   - Response times
   - Error rates
   - Usage patterns

## Troubleshooting

### Images not generating

1. Check browser console for errors
2. Verify API key in environment variables
3. Check function logs in Vercel dashboard
4. Test API directly: 
   ```bash
   curl -X POST https://api.whomeai.com/v1/images/generations \
     -H "Authorization: Bearer sk-demo" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test", "model": "nano-banana", "size": "1024x1024", "n": 1}'
   ```

### 404 errors on images

1. Ensure `api/generateImages.js` is deployed
2. Check that `vercel.json` is included
3. Verify function permissions in project settings

### Environment variables not loading

1. Confirm variables are set in Vercel dashboard
2. Redeploy after adding variables (usually automatic)
3. Check browser console: `window.__ENV__`
4. Use Vercel CLI to list variables: `vercel env ls`

### CORS issues

The serverless function (`api/generateImages.js`) handles CORS by proxying requests through Vercel's domain, avoiding cross-origin restrictions.

## Performance Optimization

### Image Optimization

Vercel automatically optimizes images, but you can further configure:

1. Use serverless functions for any processing
2. Implement client-side caching
3. Use CDN for static assets (automatic)

### Build Times

- Static site: ~1 minute
- No dependencies to install
- Instant cache on subsequent deploys

## Security Best Practices

1. **API Key Protection**
   - Never commit API keys to repository
   - Always use environment variables
   - Rotate keys periodically

2. **HTTPS**
   - Automatically enabled on all Vercel domains
   - Certificate renews automatically

3. **Content Security Policy**
   - Configured in `vercel.json`
   - Prevents XSS attacks

## Rollback & Versions

To revert to a previous deployment:

1. Go to "Deployments" tab
2. Find the deployment you want
3. Click "Promote to Production"

Or via CLI:
```bash
vercel --prod [commit-hash]
```

## Cost Considerations

- **Free tier**: 100 GB bandwidth/month, unlimited deployments
- **Serverless Functions**: Free tier covers API usage well
- **Custom domains**: Included in free tier
- **Preview deployments**: Unlimited

## Next Steps

1. Set up monitoring and alerts
2. Configure analytics
3. Set up custom domain
4. Create automated testing in CI/CD
5. Implement staging environment

## Support

- Vercel Docs: https://vercel.com/docs
- WhomeAI API: https://whomeai.com/docs
- GitHub Issues: Report deployment issues in repository

---

**Happy Deploying!** 🚀

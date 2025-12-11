# Vercel Deployment Checklist

Use this checklist to ensure everything is properly configured before deploying.

## Pre-Deployment Verification

### Configuration Files
- [ ] `vercel.json` exists and contains valid JSON
- [ ] `config.js` exists and has environment handling
- [ ] `.env.example` exists with required variables
- [ ] `.vercelignore` exists with proper ignore rules
- [ ] `.gitignore` includes `.env.local` and other sensitive files

### Application Files
- [ ] `script.js` has `isProduction()` function
- [ ] `script.js` routes to `/api/generateImages` in production
- [ ] `index.html` includes `config.js` script tag
- [ ] `styles.css` unchanged and valid
- [ ] No hardcoded API keys in any client files

### API Function
- [ ] `api/generateImages.js` exists
- [ ] Function validates incoming requests
- [ ] Function reads `WHOMEAI_API_KEY` from environment
- [ ] Function properly proxies to WhomeAI API
- [ ] Error handling implemented

### CI/CD
- [ ] `.github/workflows/deploy.yml` exists
- [ ] Workflow triggers on push to main
- [ ] Workflow has correct Vercel integration
- [ ] Secrets configured in GitHub (if needed)

### Documentation
- [ ] `README.md` updated with deployment section
- [ ] `QUICKSTART.md` provides 5-minute guide
- [ ] `DEPLOYMENT.md` has complete instructions
- [ ] `ENVIRONMENT.md` explains variable setup
- [ ] `TESTING.md` has verification procedures
- [ ] `VERCEL_SETUP.md` has technical overview
- [ ] `GET_STARTED.md` has quick navigation

### Code Quality
- [ ] No console.log statements for debugging
- [ ] No commented-out code blocks
- [ ] Proper error handling throughout
- [ ] No syntax errors (use: `node -c script.js`)
- [ ] JSON files are valid (use: `node -e "JSON.parse(...)`)

## Pre-Push to GitHub

- [ ] All changes committed to correct branch (`feat-vercel-deploy-imagegen-env`)
- [ ] No uncommitted changes
- [ ] Branch name is descriptive
- [ ] Commit messages are clear
- [ ] No sensitive data in commits

```bash
# Verify git status
git status

# Should show:
# On branch feat-vercel-deploy-imagegen-env
# nothing to commit, working tree clean
```

## GitHub Integration

- [ ] GitHub repository is public (or private, if preferred)
- [ ] Repository has main branch
- [ ] All commits pushed to main
- [ ] No merge conflicts
- [ ] Branch protections (optional)

## Vercel Configuration

Before deploying, gather these values:

- [ ] Vercel account created
- [ ] GitHub connected to Vercel
- [ ] Project name decided
- [ ] WhomeAI API key obtained (use `sk-demo` for testing)
- [ ] Custom domain (optional, can be added later)

### Environment Variables to Set

```
Variable Name: WHOMEAI_API_KEY
Value: sk-demo (or your production key)
Environments: Production, Preview, Development
```

- [ ] Variable name matches exactly
- [ ] Value is valid API key
- [ ] All environments selected (or specify as needed)

## Deployment Steps

### Step 1: Connect Repository
- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Add New" → "Project"
- [ ] Select your GitHub repository
- [ ] Vercel auto-detects from `vercel.json`

### Step 2: Configure Settings
- [ ] Framework: Confirm as Static
- [ ] Build Command: Confirmed (or "echo 'Static site'")
- [ ] Output Directory: Confirmed as "./"
- [ ] Environment Variables: Ready to set

### Step 3: Set Environment Variables
- [ ] Add `WHOMEAI_API_KEY` variable
- [ ] Set value to `sk-demo`
- [ ] Select all environments
- [ ] Click "Save"

### Step 4: Deploy
- [ ] Click "Deploy" button
- [ ] Monitor deployment progress
- [ ] Wait for "Deployment Complete" message
- [ ] Note the deployment URL

## Post-Deployment Verification

### Access Site
- [ ] Site loads without errors
- [ ] All CSS and fonts loaded correctly
- [ ] JavaScript console has no errors
- [ ] Images display properly

### Test Core Functionality
- [ ] Can enter prompt
- [ ] Can select model, size, quantity
- [ ] Can click "Generate Images"
- [ ] Loading state appears
- [ ] Images generate successfully
- [ ] Can view full-size image
- [ ] Can download image
- [ ] Modal closes properly

### Verify Security
- [ ] HTTPS working (check URL)
- [ ] API key not visible in console
- [ ] Network tab shows `/api/generateImages` calls
- [ ] API key not exposed in network requests
- [ ] Security headers present (check HTTP headers)

### Check Performance
- [ ] Page loads quickly (< 2 seconds)
- [ ] Images load without lag
- [ ] Responsive design works
- [ ] No memory leaks (check DevTools)

### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Works on mobile

## Configuration Verification

### Check Vercel Settings
- [ ] Project settings accessible
- [ ] Environment variables visible
- [ ] Deployments show success
- [ ] Domains configured
- [ ] Analytics enabled (optional)

### Check GitHub Integration
- [ ] GitHub integration active
- [ ] Automatic deployments enabled
- [ ] GitHub Actions logs visible
- [ ] Status checks pass

### Check File Deployment
```bash
# Files should be deployed
- index.html
- script.js
- styles.css
- config.js
- vercel.json
- api/generateImages.js
```

## Testing Procedures

### Quick Test (5 minutes)
- [ ] Visit deployed URL
- [ ] Generate image with default settings
- [ ] Verify image displays
- [ ] Check browser console for errors

### Complete Test (Follow TESTING.md)
- [ ] Local testing procedures
- [ ] Production verification
- [ ] Error handling tests
- [ ] Performance tests
- [ ] Security tests

## Monitoring Setup

### Enable Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking (optional)
- [ ] Performance monitoring
- [ ] Deployment notifications

### Create Alerts
- [ ] High error rate alert
- [ ] Deployment failure alert
- [ ] Performance degradation alert

## Troubleshooting Preparation

### Documentation Ready
- [ ] DEPLOYMENT.md open for reference
- [ ] ENVIRONMENT.md available for questions
- [ ] TESTING.md for verification steps

### Support Channels
- [ ] Vercel Support link saved
- [ ] WhomeAI API docs bookmarked
- [ ] GitHub Issues accessible

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor deployment
- [ ] Check error logs
- [ ] Verify all functions working
- [ ] Test on multiple devices

### Short Term (Week 1)
- [ ] Set up custom domain (if applicable)
- [ ] Enable analytics
- [ ] Configure monitoring
- [ ] Create documentation links

### Medium Term (Month 1)
- [ ] Analyze performance metrics
- [ ] Plan scaling if needed
- [ ] Implement additional features
- [ ] Update documentation

### Long Term (Ongoing)
- [ ] Monitor for errors
- [ ] Review performance regularly
- [ ] Plan maintenance windows
- [ ] Update dependencies

## Final Sign-Off

### Before Marking Deployment as Complete:

- [ ] All checklist items verified
- [ ] Deployment URL working
- [ ] Core functionality tested
- [ ] Security verified
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Team notified
- [ ] Monitoring active

### Sign-Off

- **Deployment Date**: _______________
- **Deployed URL**: _______________
- **Deployed By**: _______________
- **Verification Completed**: _______________

---

## Quick Reference Commands

```bash
# Check git status
git status

# Verify JavaScript syntax
node -c script.js
node -c config.js
node -c api/generateImages.js

# Verify JSON
node -e "JSON.parse(require('fs').readFileSync('vercel.json'))"

# View Vercel logs (after installing Vercel CLI)
vercel logs <deployment-url>

# Redeploy if needed
vercel --prod

# Check environment variables
vercel env ls
```

## Need Help?

1. **Deployment issues?** → See DEPLOYMENT.md
2. **Environment setup?** → See ENVIRONMENT.md
3. **Testing guidance?** → See TESTING.md
4. **Technical questions?** → See VERCEL_SETUP.md
5. **Quick start?** → See QUICKSTART.md

---

**Congratulations!** Your WebsiteBio AI Image Generator is deployed to Vercel! 🎉

All systems go. Happy deploying! 🚀

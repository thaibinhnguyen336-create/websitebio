# Environment Configuration Guide

This document explains how to configure environment variables for the WebsiteBio AI Image Generator.

## Overview

The application uses environment variables to:
- Securely store the WhomeAI API key
- Configure API endpoints
- Set deployment environment

Environment variables are:
- **Stored securely** on Vercel (never in git)
- **Injected at deploy time** into serverless functions
- **Not exposed to frontend** directly (proxied through serverless function)

## Local Development

### 1. Create `.env.local` File

Create a file named `.env.local` in the project root:

```bash
# .env.local (DO NOT commit this file)
WHOMEAI_API_KEY=sk-demo
VITE_WHOMEAI_API_ENDPOINT=https://api.whomeai.com/v1/images/generations
```

**Important**: `.env.local` is in `.gitignore` and will never be committed to Git.

### 2. Run Local Server

When running locally, the app:
1. Uses the demo key from `config.js` by default
2. Makes direct API calls to WhomeAI
3. Bypasses the serverless function

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

### 3. Override API Key Locally

To test with a different API key:

```javascript
// In browser console
localStorage.setItem('websitebio-api-key', 'your-api-key-here');
// Reload page
```

## Production (Vercel)

### 1. Set Environment Variables in Vercel Dashboard

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add variable:
   - **Name**: `WHOMEAI_API_KEY`
   - **Value**: `sk-demo` (or your API key)
   - **Environments**: Production, Preview, Development

### 2. Set via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Add environment variable
vercel env add WHOMEAI_API_KEY
# Enter value: sk-demo

# Deploy with environment variable
vercel --prod
```

### 3. Environment Variable Access

#### In Serverless Functions

The API key is available in serverless functions:

```javascript
// api/generateImages.js
const apiKey = process.env.WHOMEAI_API_KEY || 'sk-demo';
```

#### In Frontend

The frontend does NOT have direct access to the API key. Instead:
1. Frontend sends request to `/api/generateImages`
2. Serverless function adds the API key
3. Function proxies request to WhomeAI API
4. Result sent back to frontend

## Environment Variable Reference

### Required Variables

#### `WHOMEAI_API_KEY`
- **Description**: Authentication key for WhomeAI API
- **Type**: String
- **Example**: `sk-demo`
- **Scope**: Serverless functions only
- **Default**: `sk-demo` (demo key)

### Optional Variables

#### `VITE_WHOMEAI_API_ENDPOINT`
- **Description**: WhomeAI API endpoint URL
- **Type**: String
- **Example**: `https://api.whomeai.com/v1/images/generations`
- **Scope**: Development/Documentation
- **Default**: `https://api.whomeai.com/v1/images/generations`

## Configuration Flow

### Development Flow
```
Browser
  ↓
script.js (uses sk-demo or localStorage key)
  ↓
Direct API call to WhomeAI
  ↓
Response back to browser
```

### Production Flow
```
Browser
  ↓
script.js (makes request to /api/generateImages)
  ↓
Vercel Serverless Function
  ├─ Reads WHOMEAI_API_KEY from environment
  ├─ Validates request
  ├─ Makes API call to WhomeAI
  ↓
Response back to browser
```

## Security Considerations

### API Key Protection

1. **Never commit API keys to Git**
   - `.env.local` is in `.gitignore`
   - Environment variables stored in Vercel only

2. **Use Serverless Functions for API Key**
   - Browser code never sees the real API key
   - API key only used in serverless function
   - Browser makes request to `/api/generateImages`

3. **Rotate Keys Regularly**
   - Change API key monthly or when compromised
   - Update in Vercel dashboard
   - No code changes needed

### CORS Protection

- Browser cannot call WhomeAI API directly from frontend
- All requests proxied through serverless function
- Prevents API key exposure in browser

## Troubleshooting

### Issue: "API Key not found"

```javascript
// Check if environment variable is loaded
console.log('API Key:', process.env.WHOMEAI_API_KEY);
```

**Solution**:
1. Verify variable is set in Vercel dashboard
2. Wait a few minutes after setting (propagation delay)
3. Redeploy the project: `vercel --prod`

### Issue: Images not generating

```javascript
// Check logs in Vercel
vercel logs [deployment-url]
```

**Common causes**:
1. API key is invalid or expired
2. API key doesn't have required permissions
3. WhomeAI API is down

### Issue: Environment Variable in Client Code

**Problem**: Accidentally exposing API key in JavaScript

```javascript
// BAD - Never do this!
const apiKey = 'sk-demo'; // Visible in browser console
```

**Solution**:
```javascript
// GOOD - Use serverless function
const response = await fetch('/api/generateImages', {
  method: 'POST',
  body: JSON.stringify(requestData)
});
```

## Best Practices

### 1. Use `.env.example` as Template

```bash
# .env.example (commit this file)
WHOMEAI_API_KEY=sk-demo
VITE_WHOMEAI_API_ENDPOINT=https://api.whomeai.com/v1/images/generations
```

New developers can use this to set up `.env.local`.

### 2. Document Required Variables

Always document in README what environment variables are needed:

```markdown
## Environment Variables

Required for production:
- `WHOMEAI_API_KEY`: Your WhomeAI API key

Optional:
- `VITE_WHOMEAI_API_ENDPOINT`: Custom API endpoint
```

### 3. Validate Variables at Runtime

```javascript
function validateEnvironment() {
  if (!process.env.WHOMEAI_API_KEY) {
    console.warn('WHOMEAI_API_KEY not set, using demo key');
  }
}
```

### 4. Use Secrets for Sensitive Data

For additional security, use GitHub Secrets:

```yaml
# .github/workflows/deploy.yml
env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Migration Guide

### From Local to Production

1. **Prepare**
   ```bash
   # Test locally with demo key
   python3 -m http.server 8000
   ```

2. **Get Production API Key**
   - Contact WhomeAI support for production key
   - Or use demo key `sk-demo`

3. **Set in Vercel**
   - Dashboard → Settings → Environment Variables
   - Add `WHOMEAI_API_KEY`

4. **Deploy**
   ```bash
   git push origin main
   # Vercel deploys automatically
   ```

5. **Verify**
   - Visit production URL
   - Generate test image
   - Check network tab (API key not exposed)

## Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [12 Factor App - Configuration](https://12factor.net/config)
- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [WhomeAI API Documentation](https://whomeai.com/docs)

## Support

For issues with environment variables:

1. Check Vercel dashboard for variable status
2. Review Vercel deployment logs
3. Test API endpoint with curl:
   ```bash
   curl -X POST https://api.whomeai.com/v1/images/generations \
     -H "Authorization: Bearer sk-demo" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test", "model": "nano-banana", "size": "1024x1024", "n": 1}'
   ```
4. Check function logs in Vercel dashboard

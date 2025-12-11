# Testing Guide

This guide covers testing the WebsiteBio AI Image Generator locally and in production.

## Local Testing

### Prerequisites
- Node.js 14+ (for running local server)
- Modern web browser
- Internet connection (for API calls)

### 1. Run Local Server

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js http-server
npx http-server -p 8000

# Using VS Code Live Server
# Right-click on index.html → Open with Live Server
```

Then open http://localhost:8000 in your browser.

### 2. Test Image Generation

1. Enter a prompt: "A serene mountain landscape at sunset"
2. Configure settings:
   - Model: Select each model option
   - Size: Test different sizes
   - Quantity: Try 1-4 images
   - Seed: Test with and without seed
3. Click "Generate Images"
4. Verify:
   - Loading spinner appears
   - Images load after generation
   - Revised prompt displays
   - No console errors

### 3. Test UI Features

#### Form Validation
- [ ] Empty prompt shows error
- [ ] Short prompt (< 5 chars) shows error
- [ ] Generate button disables while generating
- [ ] Settings persist after page reload

#### Image Gallery
- [ ] Images display in grid
- [ ] Click image opens modal
- [ ] Modal shows full-size image
- [ ] Revised prompt displays
- [ ] Download button works

#### Download Feature
- [ ] Click download triggers file save
- [ ] File name format: `websitebio-generated-[id].png`
- [ ] Image data is valid PNG

#### Modal Controls
- [ ] Close button (×) works
- [ ] Escape key closes modal
- [ ] Click outside modal closes it
- [ ] Body scroll disabled while modal open

#### Keyboard Shortcuts
- [ ] Ctrl+Enter generates images
- [ ] Escape closes modal

### 4. Test Error Handling

Create these error scenarios:

#### Network Error
```javascript
// In browser console
state.baseUrl = 'https://invalid-api-url.example.com';
// Try to generate → should show API error
```

#### Invalid API Key
```javascript
state.apiKey = 'invalid-key';
// Try to generate → should show authorization error
```

#### Empty Response
```javascript
// Mock in DevTools
// Intercept request and return empty response
// Should show "No images returned" error
```

### 5. Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Chromium 80+
- [ ] Firefox 75+
- [ ] Safari 13+
- [ ] Edge 80+

Check for:
- [ ] CSS Grid rendering
- [ ] Flexbox layouts
- [ ] Animations smooth
- [ ] No console errors

### 6. Mobile Testing

Test responsive design:

```bash
# Using Chrome DevTools
1. Press F12 → Click device toggle
2. Test on different device sizes:
   - iPhone 12/13 (390×844)
   - iPad (768×1024)
   - Galaxy S21 (360×800)
```

Verify:
- [ ] Layout adapts to screen width
- [ ] Buttons are touch-friendly (48px minimum)
- [ ] Scrolling is smooth
- [ ] Images display properly

### 7. Performance Testing

#### Time to Interactive
```bash
# In browser console
performance.getEntriesByType('navigation')[0]
# Check: domInteractive, domComplete, loadEventEnd
```

#### API Response Time
```bash
# In Network tab
# Generate image and check request time
# Should be < 30 seconds total
```

#### Memory Usage
```bash
# DevTools → Memory
# Generate multiple images
# Check for memory leaks
# Should stabilize, not continuously grow
```

### 8. Network Testing

#### Offline Mode
```bash
1. Open DevTools → Network
2. Click "Offline"
3. Try to generate image
4. Should show error, retry button should work
```

#### Slow Connection
```bash
1. DevTools → Network
2. Set throttle to "Slow 4G"
3. Try to generate
4. Loading indicator should appear
5. Should handle timeout gracefully
```

## Production Testing (Vercel)

### 1. Verify Deployment

After deploying to Vercel:

```bash
# Check site is accessible
curl -I https://your-site.vercel.app

# Should return 200 OK
```

### 2. Test API Endpoint

```bash
# Test the serverless function
curl -X POST https://your-site.vercel.app/api/generateImages \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test image",
    "model": "nano-banana",
    "size": "1024x1024",
    "n": 1
  }'

# Should return images or proper error
```

### 3. Environment Variables

```bash
# Verify in browser console
# Should NOT expose the actual API key
window.__ENV__.WHOMEAI_API_KEY === 'sk-demo' // or your key

# Check that requests are proxied through serverless function
# Network tab → api/generateImages → Check request/response
```

### 4. Security Checks

- [ ] API key is NOT in client code
- [ ] API key is NOT in network requests from browser
- [ ] HTTPS is enforced
- [ ] Security headers are present:
  ```bash
  curl -I https://your-site.vercel.app
  # Look for: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
  ```

### 5. Performance Metrics

Check Vercel Analytics:

```
Dashboard → Analytics
- Time to First Byte (TTFB): < 200ms
- First Contentful Paint (FCP): < 1s
- Cumulative Layout Shift (CLS): < 0.1
```

### 6. Load Testing

Test with multiple concurrent requests:

```bash
# Using Apache Bench
ab -n 100 -c 10 https://your-site.vercel.app/api/generateImages

# Using hey (Go HTTP benchmarking tool)
hey -z 60s https://your-site.vercel.app
```

### 7. Integration Testing

#### End-to-End Flow
1. Visit site URL
2. Generate image with all model options
3. Download generated image
4. Verify image file is valid

#### Edge Cases
- [ ] Generate with all models
- [ ] Generate with all sizes
- [ ] Generate 1-4 images
- [ ] Generate with seed
- [ ] Generate without seed
- [ ] Multiple generations in sequence
- [ ] Download multiple times

## Automated Testing

### Unit Tests

Example test for API validation:

```javascript
// tests/api.test.js
async function testGenerateImagesAPI() {
  const response = await fetch('/api/generateImages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'test',
      model: 'nano-banana',
      size: '1024x1024',
      n: 1
    })
  });
  
  console.assert(response.status === 200, 'Should return 200');
  const data = await response.json();
  console.assert(data.images, 'Should have images');
  console.assert(data.images.length === 1, 'Should have 1 image');
}
```

### Monitoring in Production

#### Sentry Integration (Optional)

```javascript
// Add to config.js
if (window.location.hostname !== 'localhost') {
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: 'production',
    tracesSampleRate: 1.0,
  });
}
```

#### Custom Error Tracking

```javascript
// In script.js - catch all errors
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error);
  // Send to monitoring service
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Send to monitoring service
});
```

## Checklist Before Release

- [ ] All unit tests pass
- [ ] No console errors
- [ ] Performance metrics acceptable
- [ ] Security headers configured
- [ ] Environment variables properly set
- [ ] API key is secure
- [ ] SSL/HTTPS enabled
- [ ] Custom domain configured (if applicable)
- [ ] Analytics tracking works
- [ ] Error logging configured
- [ ] Automated backups configured
- [ ] Cache headers optimized
- [ ] Rate limiting configured
- [ ] Monitoring alerts set up
- [ ] Runbook created for common issues

## Troubleshooting

### Images not generating
1. Check API key in environment variables
2. Verify function logs in Vercel dashboard
3. Test API endpoint directly with curl
4. Check network tab for CORS errors

### 404 errors
1. Verify vercel.json is deployed
2. Check api/generateImages.js exists
3. Verify rewrites in vercel.json

### Slow generation
1. Check WhomeAI API status
2. Monitor function execution time
3. Consider caching generated images
4. Implement request debouncing

### High memory usage
1. Clear images after generation
2. Implement image pagination
3. Monitor Vercel function memory

## Resources

- [Vercel Monitoring](https://vercel.com/docs/analytics)
- [WhomeAI API Docs](https://whomeai.com/docs)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Security Headers](https://securityheaders.com)

// Application Configuration
// This file handles environment variables for the frontend

window.__ENV__ = {
  WHOMEAI_API_KEY: (typeof process !== 'undefined' && process.env && process.env.WHOMEAI_API_KEY) || 'sk-demo',
  WHOMEAI_API_ENDPOINT: (typeof process !== 'undefined' && process.env && process.env.VITE_WHOMEAI_API_ENDPOINT) || 'https://api.whomeai.com/v1/images/generations'
};

console.log('Configuration loaded:', {
  apiEndpoint: window.__ENV__.WHOMEAI_API_ENDPOINT,
  hasApiKey: !!window.__ENV__.WHOMEAI_API_KEY
});

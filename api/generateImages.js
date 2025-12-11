export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model, size, n, seed } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.WHOMEAI_API_KEY || 'sk-demo';
  const baseUrl = 'https://api.whomeai.com/v1/images/generations';

  try {
    const requestBody = {
      prompt,
      model: model || 'nano-banana',
      size: size || '1024x1024',
      n: n || 1
    };

    if (seed) {
      requestBody.seed = seed;
    }

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();

    if (!data.images || !Array.isArray(data.images)) {
      return res.status(500).json({ error: 'Invalid response from API: No images returned' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate images'
    });
  }
}

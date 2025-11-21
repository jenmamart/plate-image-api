export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, prompt, step } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // Step 1: Analyze plate with GPT-4 Vision
    if (step === 'analyze') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this ceramic plate in detail for image generation - focus on its shape, color, pattern, texture, and style. Be specific and concise, max 2 sentences.' },
              { type: 'image_url', image_url: { url: image } }
            ]
          }],
          max_tokens: 150
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Vision API error');
      return res.status(200).json({ description: data.choices[0]?.message?.content });
    }

    // Step 2: Generate image with DALL-E 3
    if (step === 'generate') {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'DALL-E API error');
      return res.status(200).json({ imageUrl: data.data[0].url });
    }

    return res.status(400).json({ error: 'Invalid step parameter' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

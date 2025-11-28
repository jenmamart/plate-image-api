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

  const { image, prompt } = req.body;
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    return res.status(500).json({ error: 'Replicate API token not configured' });
  }

  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
        input: {
          image: image,
          prompt: prompt,
          strength: 0.3, // Lower strength = more preservation of original
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 30
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();
    
    let result = prediction;
    let attempts = 0;
    while ((result.status === 'starting' || result.status === 'processing') && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Token ${replicateToken}`,
        }
      });
      
      result = await pollResponse.json();
    }

    if (result.status === 'succeeded') {
      return res.status(200).json({ 
        imageUrl: result.output && result.output.length > 0 ? result.output[0] : result.output
      });
    } else {
      throw new Error(result.error || 'Generation failed');
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

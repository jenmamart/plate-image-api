export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { step, image, prompt, predictionId } = req.body;
    const removeBgKey = process.env.REMOVEBG_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    if (!removeBgKey || !replicateToken) {
      return res.status(500).json({ error: 'API keys not configured' });
    }

    if (step === 'removebg') {
      const base64Data = image.split(',')[1];
      
      const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': removeBgKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_file_b64: base64Data,
          size: 'auto'
        })
      });

      if (!removeBgResponse.ok) {
        const errorText = await removeBgResponse.text();
        throw new Error(`Background removal failed: ${errorText}`);
      }

      const plateNoBackground = await removeBgResponse.arrayBuffer();
      const plateBase64 = 'data:image/png;base64,' + Buffer.from(plateNoBackground).toString('base64');

      return res.status(200).json({ plateImage: plateBase64 });
    }

    if (step === 'startScene') {
      const backgroundPrompt = 'Overhead view of a cozy winter table setting. Soft candlelight, warm tea mug, knit blanket draped over edge, scattered snacks like berries, chocolate, cheese. Empty space in center for a plate. Professional lifestyle photography, warm inviting lighting, shallow depth of field, Etsy aesthetic. No plate visible in the scene.';
      
      const sceneResponse = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + replicateToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: '39ed52f2a78e934b3ba6e2a89f5b1c7

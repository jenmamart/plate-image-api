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

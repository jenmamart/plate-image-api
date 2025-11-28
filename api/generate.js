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
  const removeBgKey = process.env.REMOVEBG_API_KEY;
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!removeBgKey || !replicateToken) {
    return res.status(500).json({ error: 'API keys not configured' });
  }

  try {
    // Step 1: Remove background from plate image
    const base64Data = image.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const formData = new FormData();
    formData.append('image_file_b64', base64Data);
    formData.append('size', 'auto');
    
    cons

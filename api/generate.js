export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { step, image, prompt, predictionId } = req.body;
    const removeBgKey = process.env.REMOVEBG_API_KEY;
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    if (!removeBgKey || !replicateToken) {
      return res.status(500).json({ error: "API keys not configured" });
    }

    if (step === "removebg") {
      const base64Data = image.split(",")[1];
      
      const removeBgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": removeBgKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_file_b64: base64Data,
          size: "auto"
        })
      });

      if (!removeBgResponse.ok) {
        const errorText = await removeBgResponse.text();
        throw new Error("Background removal failed: " + errorText);
      }

      const plateNoBackground = await removeBgResponse.arrayBuffer();
      const plateBase64 = "data:image/png;base64," + Buffer.from(plateNoBackground).toString("base64");

      return res.status(200).json({ plateImage: plateBase64 });
    }

    if (step === "startScene") {
      const backgroundPrompt = "Overhead view of a cozy winter table setting. Soft candlelight, warm tea mug, knit blanket draped over edge, scattered snacks like berries, chocolate, cheese. Empty space in center for a plate. Professional lifestyle photography, warm inviting lighting, shallow depth of field, Etsy aesthetic. No plate visible in the scene.";
      
      const sceneResponse = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": "Token " + replicateToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
          input: {
            prompt: backgroundPrompt,
            width: 1024,
            height: 1024
          }
        })
      });

      if (!sceneResponse.ok) {
        const errorText = await sceneResponse.text();
        console.log("Scene start error:", errorText);
        throw new Error("Scene generation failed: " + errorText);
      }

      const scenePrediction = await sceneResponse.json();
      return res.status(200).json({ predictionId: scenePrediction.id });
    }

    if (step === "checkScene") {
      const pollResponse = await fetch("https://api.replicate.com/v1/predictions/" + predictionId, {
        headers: {
          "Authorization": "Token " + replicateToken,
        }
      });

      const prediction = await pollResponse.json();
      
      console.log("Prediction status:", prediction.status);
      
      if (prediction.status === "succeeded") {
        const sceneImageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        return res.status(200).json({ status: "succeeded", backgroundImage: sceneImageUrl });
      } else if (prediction.status === "failed") {
        console.log("Prediction failed:", prediction.error);
        throw new Error(prediction.error || "Scene generation failed");
      } else {
        return res.status(200).json({ status: prediction.status });
      }
    }

    return res.status(400).json({ error: "Invalid step parameter" });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/analyse-image", async (req, res) => {
  try {
    const image = req.body.image;

    if (!image) {
      return res.status(400).json({ error: "Image manquante" });
    }

    // 1. ANALYSE IMAGE
    const vision = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Liste simplement les aliments visibles sur cette image."
            },
            {
              type: "input_image",
              image_url: image
            }
          ]
        }
      ]
    });

    const ingredients = vision.output_text;

    // 2. RECETTE
    const recipeRes = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `Fais une recette simple avec : ${ingredients}`
    });

    const recipeText = recipeRes.output_text;

    // 3. MACROS (JSON propre)
    const macrosRes = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Retourne UNIQUEMENT un JSON :

{
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0
}

Recette:
${recipeText}
      `
    });

    let macros;
    try {
      const cleaned = macrosRes.output_text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      macros = JSON.parse(cleaned);
    } catch {
      macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    // 4. IMAGE (VERSION CORRIGÉE)
    let imageUrl = null;

    try {
      const imageGen = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `high quality realistic food photo of: ${recipeText}`,
        size: "1024x1024"
      });

      // 🔥 IMPORTANT: base64 ou url
      if (imageGen.data?.[0]?.b64_json) {
        imageUrl = `data:image/png;base64,${imageGen.data[0].b64_json}`;
      } else {
        imageUrl = imageGen.data?.[0]?.url || null;
      }

    } catch (err) {
      console.log("IMAGE ERROR:", err.message);
    }

    // 5. RESPONSE
    res.json({
      ingredients,
      recipe: recipeText,
      macros,
      image: imageUrl
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

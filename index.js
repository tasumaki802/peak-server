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

    // 1. Analyse image (ingrédients)
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

    // 2. Recette
    const recipeRes = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `Fais une recette simple, rapide et claire avec ces ingrédients : ${ingredients}`
    });

    const recipeText = recipeRes.output_text;

    // 3. MACROS (VERSION FIABLE)
    const macrosRes = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Tu es un nutritionniste expert.

Estime les calories et macros de ce plat.

IMPORTANT :
- utilise des portions normales pour 1 personne
- sois réaliste et cohérent
- ne mets jamais 0 sauf si impossible

Aliments :
${ingredients}

Recette :
${recipeText}

Réponds UNIQUEMENT en JSON :

{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}
`
    });

    let macros;

    try {
      const cleaned = macrosRes.output_text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      macros = JSON.parse(cleaned);

      // sécurité
      macros = {
        calories: macros.calories || 250,
        protein: macros.protein || 10,
        carbs: macros.carbs || 20,
        fat: macros.fat || 10
      };

    } catch (e) {
      macros = {
        calories: 250,
        protein: 10,
        carbs: 20,
        fat: 10
      };
    }

    // 4. IMAGE DU PLAT
    let imageUrl = null;

    try {
      const imageGen = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `high quality realistic food photo of: ${recipeText}`,
        size: "1024x1024"
      });

      imageUrl = imageGen.data?.[0]?.url || null;

    } catch (err) {
      console.log("Image error:", err.message);
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

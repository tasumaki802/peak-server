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
              text: "Liste les aliments visibles sur cette image de manière simple."
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

    // 3. Macros (JSON STRICT)
    const macrosRes = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Tu es un nutritionniste.

Retourne UNIQUEMENT un JSON valide SANS texte ni markdown.

Format exact :
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}

Recette :
${recipeText}
      `
    });

    let macros;
    try {
      macros = JSON.parse(macrosRes.output_text);
    } catch (e) {
      macros = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
    }

    // 4. Image du plat (optionnel mais stylé)
    const imageGen = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `professional realistic food photography of: ${recipeText}`,
      size: "1024x1024"
    });

    res.json({
      ingredients,
      recipe: recipeText,
      macros,
      image: imageGen.data?.[0]?.url || null
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

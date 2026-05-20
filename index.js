import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config(); // 🔥 OBLIGATOIRE pour lire .env

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/analyse-image", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image manquante" });
    }

    // 1️⃣ Analyse image → ingrédients
    const vision = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Liste uniquement les aliments visibles." },
          { type: "input_image", image_url: image }
        ]
      }]
    });

    const ingredients = vision.output_text;

    // 2️⃣ Recette AVEC GRAMMES (clé pour macros justes)
    const recipeRes = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Fais une recette pour 1 personne avec ces ingrédients.

OBLIGATOIRE :
- Donne les quantités en GRAMMES pour chaque ingrédient
- Étapes simples

Ingrédients :
${ingredients}
`
    });

    const recipe = recipeRes.output_text;

    // 3️⃣ Macros basées sur les grammes
    const macrosRes = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Tu es nutritionniste.

À partir des quantités en grammes, calcule les macros.

Réponds UNIQUEMENT en JSON :

{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}

Recette :
${recipe}
`
    });

    let macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    try {
      macros = JSON.parse(
        macrosRes.output_text.replace(/```json|```/g, "").trim()
      );
    } catch {}

    // 4️⃣ Image (optionnelle)
    let imageUrl = null;

    try {
      const imageGen = await openai.images.generate({
        model: "gpt-image-1",
        prompt: `professional food photography of: ${recipe}`,
        size: "1024x1024"
      });

      imageUrl = imageGen.data?.[0]?.url || null;
    } catch {}

    // 5️⃣ Réponse finale
    res.json({
      ingredients,
      recipe,
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

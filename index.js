import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ROUTE PRINCIPALE
app.post("/analyse-image", async (req, res) => {
  try {
    const image = req.body.image;

    // 1. ingrédients
    const vision = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Liste les aliments visibles sur cette image." },
            { type: "input_image", image_url: image }
          ]
        }
      ]
    });

    const ingredients = vision.output_text;

    // 2. recette
    const recipe = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `Fais une recette simple, claire et rapide avec ces ingrédients : ${ingredients}`
    });

    const recipeText = recipe.output_text;

    // 3. macros
    const macros = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
Donne uniquement un JSON propre avec :
- calories
- protein
- carbs
- fat

pour cette recette :
${recipeText}
      `
    });

    // 4. image du plat
    const imageGen = await openai.images.generate({
      model: "gpt-image-1",
      prompt: `realistic high quality food photo of: ${recipeText}`,
      size: "1024x1024"
    });

    res.json({
      ingredients,
      recipe: recipeText,
      macros: macros.output_text,
      image: imageGen.data[0].url
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SERVER START
app.listen(3000, () => {
  console.log("Server running");
});

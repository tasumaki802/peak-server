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

    const response = await openai.responses.create({
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

    const ingredients = response.output_text;

    const recipe = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `Fais une recette simple avec : ${ingredients}`
    });

    res.json({
      ingredients,
      recipe: recipe.output_text
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running"));

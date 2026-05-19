import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/analyse-image", async (req, res) => {
  const imageBase64 = req.body.image;

  const vision = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Liste les ingrédients visibles." },
          { type: "image_url", image_url: { url: imageBase64 } }
        ]
      }
    ]
  });

  const ingredients = vision.choices[0].message.content;

  const recipe = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Fais une recette simple avec : ${ingredients}`
      }
    ]
  });

  res.json({
    ingredients,
    recipe: recipe.choices[0].message.content
  });
});

app.listen(3000, () => console.log("Server running"));

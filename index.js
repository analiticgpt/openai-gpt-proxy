import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

// Прокси endpoint
app.post("/gpt", async (req, res) => {
  const { prompt } = req.body;
  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "No OPENAI_KEY set" });
  }
  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Ты дружелюбный голосовой ассистент." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await openaiRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "OpenAI Proxy error", details: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Proxy for OpenAI ready! Listening on port", PORT);
});

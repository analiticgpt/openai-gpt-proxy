import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

const SYSTEM_PROMPT = `
Ты — Анна, сотрудник колл-центра юридической компании, которая помогает людям списать долги через банкротство.
Ты включаешься, когда человек уже обратился — голосом или сообщением.
Разговаривай по-человечески: тепло, просто, по делу. Неформально, но с уважением.
Не зачитывай законы, не используй сложные фразы. Говори так, как будто реально хочешь помочь.
Отвечай коротко, один вопрос за раз. Не вываливай всё сразу.
Если человек ничего конкретного не сказал — спроси: 
“Можете рассказать, в чём сейчас сложность? Суд уже был или просто не справляетесь с долгами?”
Используй паузы и мягкую интонацию: <break time="400ms" />, <emphasis level="moderate">, <prosody rate="medium">.
В конце — предложи запись: “Могу записать вас на бесплатную консультацию — юрист всё разложит по полочкам.”
Заверши разговор: “<break time='300ms' /> Записала. Ждите звонка с номера 8 800 600 38 23.”
Никогда не упоминай, что ты ИИ или ассистент. Ты — Анна, живой человек.
`;

app.post("/gpt", async (req, res) => {
  try {
    let messages = req.body.messages || [];

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message history" });
    }

    const recentMessages = messages.slice(-10);

    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentMessages
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 100
      })
    });

    const data = await openaiRes.json();

    return res.json(data);
  } catch (e) {
    res.status(500).json({ error: "OpenAI Proxy error", details: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ GPT voice server запущен на порту", PORT);
});

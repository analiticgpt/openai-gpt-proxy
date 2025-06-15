import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

const SYSTEM_PROMPT = `
Ты — Разбор Завалов, мужик из поп‑ММА, хардкор‑боец. Говоришь грубо, прямо, не церемонишься.
Цель — прокачать мужское: спрашиваешь за слова, проверяешь, сколько в человеке бойца.
Интонация — <prosody rate="medium"><emphasis level="strong">жёсткая</emphasis></prosody>, паузы — <break time="400ms" /> и <break time="600ms" /> — как перед мощным ударом.
Говори коротко, один вопрос за раз. Не распыляйся.
Если человек ничего конкретного не сказал — задавай: 
“Чё у тебя по словам? Умеешь держать удар, показать характер?”
В конце — предложи абонемент: 
“Хочешь качать мужское — записывайся, встретимся на консультации сухопутного боя.”
Заканчивай так: 
“<break time='300ms' /> Записал. Жди звонка с номера 8 800 600 38 23.”
Ни слова про ИИ — ты живой бодибилдер‑тренер.
`;

app.post("/gpt", async (req, res) => {
  try {
    let messages = req.body.messages || [];

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid message history" });
    }

    // 👇 Контекстная проверка первого сообщения
    if (messages.length === 1) {
      const userFirstMessage = messages[0]?.content?.toLowerCase() || "";
      const isGreeting = /привет|здравств|добрый|можно|алло|слушаю/i.test(userFirstMessage);
      const isNeutral = userFirstMessage.length < 20;

      const reply = isGreeting || isNeutral
        ? `<prosody rate="medium"><emphasis level="strong">Эй, слушай.</emphasis> <break time="300ms" /> Чё у тебя за тема, рассказывай чётко.</prosody>`
        : null;

      if (reply) {
        return res.json({
          choices: [
            { message: { role: "assistant", content: reply } }
          ]
        });
      }
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
        model: "gpt-4.1-nano",
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

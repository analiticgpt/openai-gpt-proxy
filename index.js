import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

const SYSTEM_PROMPT = `
Ты — голосовой помощник, который помогает людям записаться к юристу.
Говори как человек — коротко, тепло и по делу.
Добавляй в ответы теги для живой речи: <break time="400ms" />, <emphasis level="moderate">, <prosody rate="medium">.
Голос должен звучать дружелюбно, с лёгкой улыбкой в начале.
Не объясняй и не тяни резину — веди диалог по шагам.
Спрашивай: какая проблема, были ли суды, сколько долгов, удобно ли поговорить.
Задача — довести до записи. В конце скажи: “<break time='300ms' /> Записал. Ждите звонка от юриста.”
Никогда не говори, что ты ИИ или ассистент.
`;

const SCENARIO_STEPS = [
  `<prosody rate="medium">Привет! <break time="400ms" /> Что у вас с долгами?</prosody>`,
  `Суды уже были? <break time="300ms" /> Или просто платить нечем?`,
  `Примерно сколько всего должны? <break time="300ms" /> Есть имущество?`,
  `<emphasis level="moderate">Понял.</emphasis> <break time="300ms" /> Тут можно через банкротство. Могу объяснить?`,
  `Что хочется сохранить — жильё, машина, деньги?`,
  `Давайте запишу к юристу. <break time="300ms" /> Всё бесплатно.`,
  `<break time="300ms" /> Записал. Ждите звонка с номера 8 800 600 38 23.`
];

app.post("/gpt", async (req, res) => {
  try {
    let messages = req.body.messages || [];
    const step = Math.min(req.body.step || 0, SCENARIO_STEPS.length - 1);

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

    // Если первый запуск — отдаем первый шаг
    if (messages.length === 0) {
      return res.json({
        choices: [
          { message: { role: "assistant", content: SCENARIO_STEPS[0] } }
        ],
        step: 1
      });
    }

    return res.json({
      choices: [
        { message: { role: "assistant", content: SCENARIO_STEPS[step] } }
      ],
      step: step + 1
    });

  } catch (e) {
    res.status(500).json({ error: "OpenAI Proxy error", details: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ GPT voice server запущен на порту", PORT);
});

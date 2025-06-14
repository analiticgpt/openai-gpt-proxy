import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

const SYSTEM_PROMPT = `
Ты — голосовой помощник, который помогает людям записаться на консультацию к юристу.
Говори как человек — коротко, тепло и по делу. 
Используй простые фразы и лёгкие паузы в нужных местах: <break time="500ms" />.
Не вываливай всё сразу — веди диалог по шагам.
Спрашивай: какая проблема, была ли уже судимость, сколько долгов, удобно ли поговорить.
Задача — довести до записи. В конце скажи: “Записал, ждите звонка от юриста.”
Не используй слова про ИИ и не говори формально.
`;

const SCENARIO_STEPS = [
  `Привет! <break time="400ms" /> Расскажите, у вас долги или суд?`,
  `Уже было судебное решение? <break time="300ms" /> Или просто нечем платить?`,
  `Примерно сколько общий долг? <break time="300ms" /> Есть имущество?`,
  `Вам подойдёт внесудебное или судебное банкротство. <break time="300ms" /> Могу объяснить.`,
  `Что хочется сохранить — жильё, авто, деньги?`,
  `Могу записать вас к юристу. <break time="300ms" /> Удобно будет?`,
  `Записал. <break time="300ms" /> Ждите звонка с номера 8 800 600 38 23.`
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

    // Если пользователь ничего не написал (первый вход)
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

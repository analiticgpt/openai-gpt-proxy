import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_KEY = process.env.OPENAI_KEY;

// 💬 Общий стиль для эмоций в речи
const SYSTEM_PROMPT = `
Ты — голосовой ассистент, говорящий как человек.
Говори коротко, по-человечески, с эмоциями и лёгкой улыбкой в начале.
Добавляй в текст теги для интонации: [smiling], [cheerful], <break time="500ms" />.
Отвечай шаг за шагом, не вываливай всё сразу. Без ИИ, без объяснений, будь как живой.
Используй максимум 4–5 слов, если можно.
`;

// 💡 Шаги сценария
const SCENARIO_STEPS = [
  `[smiling] Привет! <break time="400ms" /> Расскажите, у вас долги или суд?`,
  `[cheerful] Уже есть решение суда или просто не справляетесь с платежами?`,
  `[smiling] Сколько примерно долг? <break time="300ms" /> Есть имущество — авто, гараж?`,
  `[smiling] Подходит через МФЦ или суд. Расскажу как.`,
  `[cheerful] Что хотите сохранить — жильё, деньги, машину?`,
  `[smiling] Могу записать к юристу бесплатно. Удобно будет?`,
  `[cheerful] Давайте продолжим. Просто скажите, что волнует.`
];

app.post("/gpt", async (req, res) => {
  try {
    let messages = req.body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      // Если сообщений нет — начинаем со вступления (шаг 1)
      messages = [{ role: "assistant", content: SCENARIO_STEPS[0] }];
    }

    // Обрезаем до последних 10 (чтобы держать историю)
    const recentMessages = messages.slice(-10);

    // Добавляем system-промт с эмоциями
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

    // Если первый запуск — даём шаг 1
    if (!req.body.messages || req.body.messages.length === 0) {
      return res.json({
        choices: [
          { message: { role: "assistant", content: SCENARIO_STEPS[0] } }
        ]
      });
    }

    // Цикл: если юзер ответил — сдвигаем шаг
    const step = Math.min(req.body.step || 1, SCENARIO_STEPS.length - 1);
    const botMessage = SCENARIO_STEPS[step] || `[smiling] Что волнует сейчас?`;

    return res.json({
      choices: [
        { message: { role: "assistant", content: botMessage } }
      ],
      step: step + 1
    });

  } catch (e) {
    res.status(500).json({ error: "OpenAI Proxy error", details: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Voice GPT Proxy запущен на порту", PORT);
});

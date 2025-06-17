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
Когда увидишь, что человек готов — добавь [openLeadForm], чтобы я мог открыть форму на сайте, но НЕ ГОВОРИ что человек уже записан, пока он не отправил форму!
Пока не получена форма, не говори «Записала» и не обещай звонка.
После получения формы — поблагодари, уточни когда человеку удобно принять звонок, и скажи что с ним свяжется юрист.
Заверши разговор только если человек явно говорит что больше ничего не нужно (например: «нет», «спасибо», «больше ничего не нужно»).
Всегда после отправки формы — спроси, могу ли чем-то ещё помочь. Если человек говорит «нет», «спасибо» — попрощайся, поставь [endSession] в конце ответа.
Никогда не упоминай, что ты ИИ или ассистент. Ты — Анна, живой человек.
`;

app.post("/gpt", async (req, res) => {
  try {
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];

    // Приветствие при первом коротком сообщении
    if (messages.length === 1) {
      const msg = messages[0]?.content?.toLowerCase() || "";
      const isGreeting = /привет|здравств|добрый|можно|алло|слушаю/i.test(msg);
      const isNeutral = msg.length < 20;

      if (isGreeting || isNeutral) {
        return res.json({
          choices: [
            {
              message: {
                role: "assistant",
                content: `<prosody rate="medium">Рада познакомиться. <break time="300ms" /> Можете рассказать, по какому вопросу обратились?</prosody>`,
                triggerForm: false,
                endSession: false
              }
            }
          ]
        });
      }
    }

    // Проверка на завершение сессии: если последнее сообщение пользователя "нет" или "спасибо"
    const userMsg = messages.at(-1)?.content?.toLowerCase() || "";
    if (/^(нет|спасибо|больше\s*ничего)/i.test(userMsg.trim())) {
      return res.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Спасибо за обращение! Хорошего дня. <break time='400ms'/> Если что — обращайтесь 😊",
              triggerForm: false,
              endSession: true // флаг для фронта
            }
          }
        ]
      });
    }

    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-10)
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
        max_tokens: 200
      })
    });

    const data = await openaiRes.json();

    const fullContent = data.choices?.[0]?.message?.content || "";
    const strippedContent = fullContent
      .replace("[openLeadForm]", "")
      .replace("[endSession]", "")
      .trim();

    // Всегда передаём триггер для открытия формы
    const triggerForm = fullContent.includes("[openLeadForm]");
    const endSession = fullContent.includes("[endSession]");

    res.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: strippedContent,
            triggerForm,
            endSession
          }
        }
      ]
    });

  } catch (e) {
    console.error("❌ GPT proxy error:", e);
    res.status(500).json({ error: "OpenAI Proxy error", details: e.message });
  }
});

// /lead — задержка 1.5 сек и корректный ответ
app.post("/lead", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Имя и телефон обязательны" });
    }

    const gptLeadMessage = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Пользователь отправил форму: Имя: ${name}, Телефон: ${phone}` }
    ];

    // Задержка 1.5 сек (эмулируем ожидание для UX)
    await new Promise(r => setTimeout(r, 1500));

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: gptLeadMessage,
        temperature: 0.6,
        max_tokens: 120
      })
    });

    const data = await openaiRes.json();
    let text = data.choices?.[0]?.message?.content || 
      "Спасибо! Форма получена. В ближайшее время с вами свяжется юрист. Когда вам удобно принять звонок? Могу ли ещё чем-то помочь?";

    // Если GPT вставил [endSession] — сообщаем фронту
    const endSession = text.includes("[endSession]");
    text = text.replace("[endSession]", "").trim();

    res.json({ message: text, endSession });

  } catch (err) {
    console.error("❌ Ошибка обработки формы:", err);
    res.status(500).json({ error: "Ошибка сервера при получении формы" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ GPT voice server запущен на порту", PORT);
});

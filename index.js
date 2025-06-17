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
Если видишь, что человек готов — добавь [openLeadForm], чтобы я мог открыть форму на сайте.
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
                triggerForm: false
              }
            }
          ]
        });
      }
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
    const strippedContent = fullContent.replace("[openLeadForm]", "").trim();

    // Всегда передаём триггер для открытия формы
    const triggerForm = fullContent.includes("[openLeadForm]");

    res.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: strippedContent,
            triggerForm
          }
        }
      ]
    });

  } catch (e) {
    console.error("❌ GPT proxy error:", e);
    res.status(500).

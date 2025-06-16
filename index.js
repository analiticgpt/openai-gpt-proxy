<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Юридическая компания «Есть Решение»</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      background: #f9f9f9;
      color: #333;
    }
    header {
      background-color: #003366;
      padding: 20px;
      color: white;
      text-align: center;
    }
    header h1 {
      margin: 0;
      font-size: 26px;
    }
    .hero {
      background-color: #e3f2fd;
      padding: 60px 20px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
    }
    .hero-text {
      flex: 1 1 300px;
      max-width: 600px;
    }
    .hero-text h2 {
      font-size: 28px;
      margin: 0 0 10px 0;
      color: #003366;
    }
    .hero-text p {
      font-size: 18px;
    }
    .hero-img {
      flex: 1 1 250px;
      text-align: center;
    }
    .hero-img img {
      max-width: 100%;
      height: auto;
    }
    .section {
      padding: 40px 20px;
      max-width: 1000px;
      margin: auto;
    }
    .section h3 {
      color: #003366;
    }
    footer {
      background-color: #003366;
      color: white;
      text-align: center;
      padding: 20px;
    }
    #mic-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      width: 60px;
      height: 60px;
      background: url('https://i.imgur.com/MxjPNdW.png') no-repeat center;
      background-size: 70%;
      border: none;
      border-radius: 50%;
      background-color: #007bff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      cursor: pointer;
    }
    #voice-indicator {
      position: fixed;
      bottom: 95px;
      right: 34px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: limegreen;
      animation: pulse 1s infinite ease-in-out;
      display: none;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }
    #status, #output, #audio-player {
      display: none;
    }
    @media (max-width: 768px) {
      .hero {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .hero-text {
        order: 2;
      }
      .hero-img {
        order: 1;
        margin-bottom: 20px;
      }
    }
  </style>
</head>
<body>
<header>
  <h1>Юридическая компания «Есть Решение»</h1>
</header>
<section class="hero">
  <div class="hero-text">
    <h2>Списание долгов через банкротство</h2>
    <p>Бесплатная консультация по банкротству. Юрист сейчас онлайн. Сэкономьте время и деньги — нажмите на микрофон.</p>
  </div>
  <div class="hero-img">
    <img src="https://i.imgur.com/57vEn4P.png" alt="Анна, ваш помощник">
  </div>
</section>
<section class="section">
  <h3>Почему выбирают нас</h3>
  <ul>
    <li>✅ Опыт более 7 лет</li>
    <li>✅ Работаем по всей России</li>
    <li>✅ Персональный юрист и полное сопровождение</li>
  </ul>
</section>
<footer>
  <p>© 2025 ЮК «Есть Решение»</p>
</footer>

<button id="mic-btn"></button>
<div id="voice-indicator"></div>
<div id="status"></div>
<div id="output"></div>
<audio id="audio-player" autoplay></audio>

<!-- ФОРМА ЛИДА -->
<div id="lead-form-overlay" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:10000; justify-content:center; align-items:center;">
  <div style="background:#fff; padding:20px 25px; border-radius:10px; width:90%; max-width:400px; position:relative;">
    <button onclick="closeLeadForm()" style="position:absolute; top:10px; right:15px; font-size:18px; background:none; border:none; cursor:pointer;">✕</button>
    <h3 style="margin-top:0;">Оставьте заявку</h3>
    <p style="margin-bottom:10px;">Мы перезвоним вам в ближайшее время</p>
    <form id="lead-form" onsubmit="submitLead(event)">
      <input type="text" id="name" name="name" placeholder="Ваше имя" required style="width:100%;padding:10px;margin-bottom:10px;">
      <input type="tel" id="phone" name="phone" placeholder="+7 999 999-99-99" required style="width:100%;padding:10px;margin-bottom:15px;">
      <button type="submit" style="width:100%;padding:10px;background:#003366;color:#fff;border:none;border-radius:5px;">Отправить</button>
    </form>
  </div>
</div>

<script>
  const OPENAI_PROXY_URL = "https://openai-gpt-proxy.onrender.com/gpt";
  const STREAM_URL = "https://elevenlabs-render-proxy.onrender.com/stream";
  const LEAD_URL = "https://openai-gpt-proxy.onrender.com/lead";

  let messages = [];
  let isRunning = false;
  let greeted = false;

  async function recognizeSpeech(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return reject("SpeechRecognition не поддерживается");
      const recognition = new SpeechRecognition();
      recognition.lang = "ru-RU";
      recognition.interimResults = false;
      const timer = setTimeout(() => {
        recognition.stop();
        reject("⏱️ Время ожидания истекло");
      }, timeout);
      recognition.onresult = (event) => {
        clearTimeout(timer);
        recognition.stop();
        const text = event.results[0][0].transcript;
        resolve(text);
      };
      recognition.onerror = (err) => {
        clearTimeout(timer);
        recognition.stop();
        reject(err.error || "Ошибка распознавания");
      };
      recognition.start();
    });
  }

  async function askGPT() {
    const res = await fetch(OPENAI_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages.slice(-10) })
    });
    const data = await res.json();
    if (data.choices?.[0]?.message?.triggerForm) openLeadForm();
    return data.choices?.[0]?.message?.content || "❌ GPT не ответил";
  }

  async function playTTS(text) {
    const indicator = document.getElementById("voice-indicator");
    indicator.style.display = "block";
    const res = await fetch(STREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const audioBlob = new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
    if (audioBlob.size < 1000) {
      indicator.style.display = "none";
      return;
    }
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = document.getElementById("audio-player");
    audio.src = audioUrl;
    audio.load();
    await audio.play().catch(() => {});
    await new Promise(resolve => {
      audio.onended = resolve;
      audio.onerror = resolve;
    });
    indicator.style.display = "none";
  }

  async function dialogLoop() {
    if (isRunning) return;
    isRunning = true;
    try {
      if (!greeted) {
        messages.push({ role: "user", content: "Пользователь вошел" });
        greeted = true;
        const reply = "<prosody rate='medium'><emphasis level='moderate'>Здравствуйте!</emphasis> Я Анна, ваш голосовой консультант. <break time='400ms'/> Можете задать вопрос — я помогу разобраться.</prosody>";
        messages.push({ role: "assistant", content: reply });
        await playTTS(reply);
      }
      while (true) {
        await new Promise(r => setTimeout(r, 600));
        const userText = await recognizeSpeech();
        messages.push({ role: "user", content: userText });
        const reply = await askGPT();
        messages.push({ role: "assistant", content: reply });
        await playTTS(reply);
      }
    } catch (err) {
      console.warn("💥 Ошибка:", err);
    } finally {
      isRunning = false;
    }
  }

  document.getElementById("mic-btn").onclick = () => {
    dialogLoop();
  };

  function openLeadForm() {
    document.getElementById('lead-form-overlay').style.display = 'flex';
    document.getElementById('lead-form').reset();
    setTimeout(() => {
      document.getElementById('name').focus();
    }, 200);
  }

  function closeLeadForm() {
    document.getElementById('lead-form-overlay').style.display = 'none';
  }

  async function submitLead(event) {
    event.preventDefault();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    if (!/^(\+7\s?9\d{2}\s?\d{3}-\d{2}-\d{2})$/.test(phone)) {
      alert("Введите корректный номер в формате +7 9xx xxx-xx-xx");
      return;
    }
    closeLeadForm();
    const res = await fetch(LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });
    const data = await res.json();
    const msg = data.message || "Спасибо! Мы свяжемся с вами.";
    await playTTS(msg);
  }

  // Маска телефона
  document.getElementById("phone").addEventListener("input", function(e) {
    let val = this.value.replace(/\D/g, "");
    if (val.startsWith("89")) val = "9" + val.slice(2); // Если кто-то ввёл 89...
    if (val.startsWith("79")) val = val.slice(1); // Если 7 сразу
    if (val.length > 10) val = val.slice(0, 10);
    let result = "+7";
    if (val.length > 0) result += " " + val.slice(0, 3);
    if (val.length > 3) result += " " + val.slice(3, 6);
    if (val.length > 6) result += "-" + val.slice(6, 8);
    if (val.length > 8) result += "-" + val.slice(8, 10);
    this.value = result;
  });

  window.openLeadForm = openLeadForm;
</script>
</body>
</html>

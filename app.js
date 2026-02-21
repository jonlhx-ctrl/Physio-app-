const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const patientInput = document.getElementById('patientInput');
const summaryContent = document.getElementById('summaryContent');
const copySummaryBtn = document.getElementById('copySummaryBtn');
const listenBtn = document.getElementById('listenBtn');
const ttsBtn = document.getElementById('ttsBtn');
const languageSelect = document.getElementById('languageSelect');

const conversation = [];
let voiceRepliesEnabled = true;
let recognition;
let isListening = false;

const locale = {
  'en-US': {
    welcome:
      "Hi, I'm your physio intake assistant. I will ask structured questions to help your physiotherapist. You can type or use voice.",
    prompts: {
      painLevel: 'Please rate your pain from 0 to 10.',
      duration: 'How long have you had this issue and did it start after an event?',
      easing: 'What makes it feel better (easing factors)?',
      aggravation: 'What makes it worse (aggravating factors)?',
      location: 'Which body part is affected? Please be specific (left/right, front/back).',
      quality: 'How would you describe the pain (sharp, dull, burning, throbbing)?',
      impact: 'How is this affecting sleep, work, exercise, or daily activities?',
      clarify: 'Any numbness, tingling, weakness, swelling, stiffness, or locking?'
    },
    summaryTitle: 'Clinical Summary',
    likely: 'Likely Issues (AI Hypothesis)',
    follow: 'Suggested Follow-up',
    redFlags: 'Red Flag Review',
    noRedFlags: 'No obvious red flags detected in current responses.',
    done: 'Thanks. I have enough detail for an initial assessment summary. You can add more details anytime.'
  },
  'es-ES': {
    welcome:
      'Hola, soy tu asistente de evaluación fisioterapéutica. Haré preguntas estructuradas para ayudar al fisioterapeuta. Puedes escribir o hablar.',
    prompts: {
      painLevel: 'Por favor, puntúa tu dolor de 0 a 10.',
      duration: '¿Cuánto tiempo llevas con este problema y empezó tras algún evento?',
      easing: '¿Qué lo mejora (factores de alivio)?',
      aggravation: '¿Qué lo empeora (factores de agravación)?',
      location: '¿Qué parte del cuerpo está afectada? Sé específico/a (izquierda/derecha, delante/detrás).',
      quality: '¿Cómo describirías el dolor (agudo, sordo, quemante, pulsátil)?',
      impact: '¿Cómo afecta al sueño, trabajo, ejercicio o actividades diarias?',
      clarify: '¿Hay hormigueo, entumecimiento, debilidad, hinchazón, rigidez o bloqueo?'
    },
    summaryTitle: 'Resumen Clínico',
    likely: 'Posibles Problemas (Hipótesis IA)',
    follow: 'Siguiente Paso Sugerido',
    redFlags: 'Revisión de Señales de Alarma',
    noRedFlags: 'No se detectan señales de alarma evidentes en las respuestas actuales.',
    done: 'Gracias. Ya tengo suficiente información para un resumen inicial. Puedes añadir más detalles.'
  }
};

const questionOrder = ['painLevel', 'duration', 'easing', 'aggravation', 'location', 'quality', 'impact', 'clarify'];
const collected = Object.fromEntries(questionOrder.map((q) => [q, '']));

function getLang() {
  return locale[languageSelect.value] ? languageSelect.value : 'en-US';
}

function getText() {
  return locale[getLang()] || locale['en-US'];
}

function speak(text) {
  if (!voiceRepliesEnabled || !('speechSynthesis' in window)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = getLang();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function addMessage(role, text) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'message-content';
  bubble.textContent = text;
  wrapper.appendChild(bubble);
  chatLog.appendChild(wrapper);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function aiMessage(text) {
  addMessage('ai', text);
  conversation.push({ role: 'ai', text });
  speak(text);
}

function patientMessage(text) {
  addMessage('patient', text);
  conversation.push({ role: 'patient', text });
}

function nextQuestion() {
  const key = questionOrder.find((item) => !collected[item]);
  if (!key) {
    return getText().done;
  }
  return getText().prompts[key];
}

function extractDetails(text) {
  const lower = text.toLowerCase();

  if (!collected.painLevel) {
    const pain = text.match(/\b([0-9]|10)\s*\/?\s*10\b|\b([0-9]|10)\b/);
    if (pain) {
      collected.painLevel = pain[1] || pain[2];
    }
  }

  if (!collected.duration) {
    const duration = text.match(/(\d+\s?(day|days|week|weeks|month|months|year|years))|(since\s+\w+\s?\d{0,4})/i);
    if (duration) {
      collected.duration = duration[0];
    }
  }

  if (!collected.easing && /(better|ease|relief|rest|ice|heat|stretch|massage|alivia|mejora|descanso)/i.test(lower)) {
    collected.easing = text;
  }

  if (!collected.aggravation && /(worse|aggravat|lifting|running|stairs|sitting|standing|bending|twisting|empeora|duele más)/i.test(lower)) {
    collected.aggravation = text;
  }

  if (!collected.location && /(shoulder|neck|back|knee|ankle|hip|elbow|wrist|arm|leg|hombro|espalda|rodilla|cuello)/i.test(lower)) {
    collected.location = text;
  }

  if (!collected.quality && /(sharp|dull|burn|throb|stiff|ache|agudo|sordo|quemante|punzante|rigidez)/i.test(lower)) {
    collected.quality = text;
  }

  if (!collected.impact && /(sleep|work|exercise|daily|walking|driving|sueño|trabajo|ejercicio|diarias)/i.test(lower)) {
    collected.impact = text;
  }

  if (!collected.clarify && /(numb|tingl|weak|swelling|locking|stiff|entumec|hormigue|debilidad|hinchaz|bloqueo)/i.test(lower)) {
    collected.clarify = text;
  }
}

function inferLikelyIssues(fullText) {
  const text = fullText.toLowerCase();
  const result = [];

  if (/shoulder|hombro/.test(text) && /(lifting|overhead|tennis|throw)/.test(text)) {
    result.push('Shoulder load-related pain, possible rotator cuff or subacromial pain pattern.');
  }
  if (/lower back|lumbar|espalda baja/.test(text) && /(sitting|bending|standing)/.test(text)) {
    result.push('Mechanical low back pain pattern with movement sensitivity.');
  }
  if (/knee|rodilla/.test(text) && /(stairs|running|squat)/.test(text)) {
    result.push('Load-related knee pain, consider patellofemoral contribution.');
  }
  if (/numb|tingl|weak|entumec|hormigue/.test(text)) {
    result.push('Possible neural involvement; perform neurological screening.');
  }
  if (!result.length) {
    result.push('Non-specific musculoskeletal presentation; objective assessment needed to refine diagnosis.');
  }

  return result;
}

function redFlags(text) {
  const flags = [
    'chest pain',
    'shortness of breath',
    'loss of bladder',
    'loss of bowel',
    'saddle numbness',
    'fever',
    'unexplained weight loss',
    'night sweats'
  ];
  return flags.filter((f) => text.includes(f));
}

function renderSummary() {
  const t = getText();
  const patientText = conversation
    .filter((entry) => entry.role === 'patient')
    .map((entry) => entry.text)
    .join(' ');

  if (!patientText.trim()) {
    summaryContent.innerHTML = '<p>Start chatting to generate a structured intake summary.</p>';
    return;
  }

  const flags = redFlags(patientText.toLowerCase());
  const likely = inferLikelyIssues(patientText);

  summaryContent.innerHTML = `
    <h3>${t.summaryTitle}</h3>
    <ul>
      <li><strong>Pain level (0-10):</strong> ${collected.painLevel || 'Not yet captured'}</li>
      <li><strong>Duration:</strong> ${collected.duration || 'Not yet captured'}</li>
      <li><strong>Easing factors:</strong> ${collected.easing || 'Not yet captured'}</li>
      <li><strong>Aggravation factors:</strong> ${collected.aggravation || 'Not yet captured'}</li>
      <li><strong>Body part/details:</strong> ${collected.location || 'Not yet captured'}</li>
      <li><strong>Condition quality:</strong> ${collected.quality || 'Not yet captured'}</li>
      <li><strong>Functional impact:</strong> ${collected.impact || 'Not yet captured'}</li>
      <li><strong>Clarifying symptoms:</strong> ${collected.clarify || 'Not yet captured'}</li>
    </ul>

    <h3>${t.likely}</h3>
    <ul>${likely.map((item) => `<li>${item}</li>`).join('')}</ul>

    <h3>${t.redFlags}</h3>
    <ul><li>${flags.length ? flags.join('</li><li>') : t.noRedFlags}</li></ul>

    <h3>${t.follow}</h3>
    <ul>
      <li>Validate history with movement, range of motion, and strength testing.</li>
      <li>Correlate symptom behavior with loading patterns and tissue irritability.</li>
      <li>Escalate if red flags appear or if symptoms are rapidly worsening.</li>
    </ul>
  `;
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = patientInput.value.trim();
  if (!text) return;
  patientMessage(text);
  extractDetails(text);
  patientInput.value = '';
  aiMessage(nextQuestion());
  renderSummary();
});

copySummaryBtn.addEventListener('click', async () => {
  const text = summaryContent.innerText.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copySummaryBtn.textContent = 'Copied';
    setTimeout(() => (copySummaryBtn.textContent = 'Copy summary'), 1000);
  } catch (_err) {
    copySummaryBtn.textContent = 'Copy unavailable';
    setTimeout(() => (copySummaryBtn.textContent = 'Copy summary'), 1000);
  }
});

languageSelect.addEventListener('change', () => {
  aiMessage(getText().welcome);
  renderSummary();
});

ttsBtn.addEventListener('click', () => {
  voiceRepliesEnabled = !voiceRepliesEnabled;
  ttsBtn.textContent = `🔊 Voice replies: ${voiceRepliesEnabled ? 'On' : 'Off'}`;
});

listenBtn.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    aiMessage('Voice input is not supported in this browser. Please type your response.');
    return;
  }

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      patientInput.value = transcript;
    };

    recognition.onend = () => {
      isListening = false;
      listenBtn.classList.remove('listening');
      listenBtn.textContent = '🎙️ Speak';
    };
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  recognition.lang = getLang();
  isListening = true;
  listenBtn.classList.add('listening');
  listenBtn.textContent = '⏺️ Listening...';
  recognition.start();
});

aiMessage(getText().welcome);
aiMessage(nextQuestion());

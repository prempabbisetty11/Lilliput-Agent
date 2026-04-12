// ---- Config ----
let API_BASE = "https://lilliput-agent.onrender.com"; // change this to your deployed URL later
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");

// ---- State ----
let isMuted = false; // for voice output
let messages = [];  // local conversation history for UI

let currentUtterance = null;
let speakSeq = 0; // increments to invalidate old speech

// Auto-focus input
if (inputEl) inputEl.focus();

// Send on Enter key
if (inputEl) {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  });
}

// ---- Helpers ----
function stopSpeaking() {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
  currentUtterance = null;
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `msg ${role.toLowerCase()}`;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${role} • ${nowTime()}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrap.appendChild(meta);
  wrap.appendChild(bubble);
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
  return bubble;
}

function setLoading(isLoading) {
  if (sendBtn) sendBtn.disabled = isLoading;
}

function showTyping(show) {
  let el = document.getElementById("typing");
  if (show) {
    if (!el) {
      el = document.createElement("div");
      el.id = "typing";
      el.className = "typing";
      el.textContent = "Agent is typing…";
      chatEl.appendChild(el);
      chatEl.scrollTop = chatEl.scrollHeight;
    }
  } else if (el) {
    el.remove();
  }
}

// ---- Main send ----
async function send() {
  const msg = inputEl.value.trim();
  // Stop any ongoing speech immediately when user sends a new message
  stopSpeaking();
  speakSeq++; // invalidate any in-flight speech
  if (!msg) return;

  // Save to local history (UI only)
  messages.push({ role: "user", content: msg, time: Date.now() });

  appendMessage("You", msg);
  inputEl.value = "";
  setLoading(true);
  showTyping(true);

  const replyBubble = appendMessage("Agent", "");
  let fullReply = "";

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`HTTP ${res.status}: ${t}`);
    }

    if (!res.body) {
      const data = await res.json();
      fullReply = data.reply || "(no reply)";
      replyBubble.textContent = fullReply;
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split("\n\n");
        buffer = segments.pop();

        for (const segment of segments) {
          if (!segment.trim()) continue;
          const lines = segment.split("\n");
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!dataLine) continue;

          const payload = JSON.parse(dataLine.slice(5).trim());
          if (payload.error) {
            throw new Error(payload.error);
          }

          if (payload.reply !== undefined) {
            fullReply += payload.reply;
            replyBubble.textContent = fullReply;
          }
        }
      }

      if (!fullReply) {
        fullReply = "(no reply)";
        replyBubble.textContent = fullReply;
      }
    }

    messages.push({ role: "assistant", content: fullReply, time: Date.now() });
    if (!isMuted) speak(fullReply);
  } catch (err) {
    console.error(err);
    appendMessage("Error", "Failed to reach the server. Is the backend running?");
  } finally {
    showTyping(false);
    setLoading(false);
  }
}

// ---- Voice input ----
function startVoice() {
  // Stop any ongoing speech before starting voice input
  stopSpeaking();
  speakSeq++; // invalidate any in-flight speech
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  recognition.onresult = function (event) {
    const text = event.results[0][0].transcript;
    inputEl.value = text;
    send();
  };

  recognition.onerror = function (e) {
    console.error("Speech recognition error:", e);
    alert("Speech recognition failed. Try again.");
  };

  recognition.start();
}

// ---- Voice output ----
let selectedVoice = null;

// Load voices and pick the best available human-like voice
function loadVoices() {
  const voices = speechSynthesis.getVoices();

  if (!voices || !voices.length) return;

  // Prefer high quality / neural / premium / branded voices
  const preferred = voices.find(v => /neural|premium|google|microsoft|siri/i.test(v.name) && v.lang.startsWith("en"))
    || voices.find(v => v.lang === "en-US")
    || voices.find(v => v.lang.startsWith("en"))
    || voices[0];

  selectedVoice = preferred;
  console.log("Selected voice:", selectedVoice?.name, selectedVoice?.lang);
}

// Some browsers load voices async
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  // Invalidate any previous speech and stop it
  stopSpeaking();

  // Token to ensure only the latest call can speak
  const mySeq = ++speakSeq;

  // Clean up text a bit for better pronunciation
  const cleaned = text.replace(/\*\*/g, "").replace(/\n+/g, ". ");

  const utterance = new SpeechSynthesisUtterance(cleaned);

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.lang = selectedVoice?.lang || "en-US";
  utterance.rate = 0.95;   // clearer
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // If a newer speech was requested, do nothing
  if (mySeq !== speakSeq) return;

  currentUtterance = utterance;

  utterance.onend = () => {
    if (currentUtterance === utterance) {
      currentUtterance = null;
    }
  };

  utterance.onerror = () => {
    if (currentUtterance === utterance) {
      currentUtterance = null;
    }
  };

  speechSynthesis.speak(utterance);
}

// ---- Mute toggle ----
function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById("muteBtn");
  if (btn) btn.textContent = isMuted ? "🔇" : "🔊";
}

// Expose functions to HTML buttons
window.send = send;
window.startVoice = startVoice;
window.toggleMute = toggleMute;
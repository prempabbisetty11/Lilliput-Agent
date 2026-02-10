// ---- Config ----
let API_BASE = "https://lilliput-agent.onrender.com"; // change this to your deployed URL later
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");

// ---- State ----
let isMuted = false; // for voice output
let messages = [];  // local conversation history for UI

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
  if (!msg) return;

  // Save to local history (UI only)
  messages.push({ role: "user", content: msg, time: Date.now() });

  appendMessage("You", msg);
  inputEl.value = "";
  setLoading(true);
  showTyping(true);

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

    const data = await res.json();
    const reply = data.reply || "(no reply)";

    messages.push({ role: "assistant", content: reply, time: Date.now() });

    appendMessage("Agent", reply);
    if (!isMuted) speak(reply);
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

  // Cancel any ongoing speech to avoid overlap
  speechSynthesis.cancel();

  // Clean up text a bit for better pronunciation
  const cleaned = text.replace(/\*\*/g, "").replace(/\n+/g, ". ");

  const utterance = new SpeechSynthesisUtterance(cleaned);

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.lang = selectedVoice?.lang || "en-US";

  // Slightly slower and clearer for better pronunciation
  utterance.rate = 0.95;   // slower = clearer
  utterance.pitch = 1.0;   // natural pitch
  utterance.volume = 1.0;  // max volume

  // Fallback: if speech fails, retry once
  utterance.onerror = () => {
    console.warn("Speech error, retrying once...");
    speechSynthesis.cancel();
    setTimeout(() => speechSynthesis.speak(utterance), 200);
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
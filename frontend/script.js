// ---- Config ----
// Use same-origin by default (works on Netlify/Render behind a proxy or when hosted together)
let API_BASE = ""; // empty = current origin
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
function scrollToBottom() {
  if (!chatEl) return;
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: "smooth" });
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
  scrollToBottom();
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
      scrollToBottom();
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
    const url = API_BASE ? `${API_BASE}/chat` : `/chat`;
    const res = await fetch(url, {
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

// Load voices and pick a good one
function loadVoices() {
  const voices = speechSynthesis.getVoices();

  // Try to find a natural / human-like English voice
  selectedVoice =
    voices.find(v => v.name.toLowerCase().includes("google")) ||
    voices.find(v => v.name.toLowerCase().includes("siri")) ||
    voices.find(v => v.name.toLowerCase().includes("microsoft")) ||
    voices.find(v => v.lang === "en-US") ||
    voices[0];

  console.log("Selected voice:", selectedVoice?.name);
}

// Some browsers load voices async
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speak(text) {
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech to avoid overlap
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.lang = "en-US";
  utterance.rate = 1.0;   // 0.8 = slower, 1.0 = normal, 1.2 = faster
  utterance.pitch = 1.0;  // 1.0 = normal human pitch
  utterance.volume = 1.0; // Max volume

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
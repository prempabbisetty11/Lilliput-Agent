# Lilliput Agent 🤖

A lightweight, voice-enabled AI chat application built with **FastAPI** on the backend and a **modern glass-style web UI** on the frontend.  
The app supports **text chat**, **voice input**, and **spoken responses**, and is designed to work well on **desktop and mobile**.

---

## ✨ Features

- 💬 Real-time chat with an AI model (via Groq through `litellm`)
- 🎤 Voice input using browser Speech Recognition
- 🔊 Natural-sounding voice output using Speech Synthesis (auto-selects best available voice)
- 📱 Responsive UI (mobile, tablet, desktop)
- 🪟 Liquid glass / dark UI design
- ⏳ Typing indicator, message timestamps, smooth animations
- 🔐 API key handled via environment variables (no secrets in code)
- 🚀 Ready for cloud deployment (e.g., Render)

- 💾 Persistent chat history (saved locally in the browser)
- 🌗 Light / Dark theme toggle with smooth transitions
- 🧑‍🤝‍🧑 Message bubble avatars (user & agent)
- ✨ Shimmer "typing…" indicator and subtle message animations

---

## 🧱 Project Structure

```
ADK_SERIES/
├── backend/
│   └── app.py            # FastAPI backend exposing /chat API
├── frontend/
│   ├── index.html        # Web UI
│   ├── style.css         # UI styles (dark glass theme, responsive)
│   └── script.js         # Frontend logic (chat, voice in/out)
├── google_agent/
│   └── agent.py          # ADK agent (for CLI / experiments)
└── README.md             # This file
```

---

## 🧠 How It Works

1. The **frontend** (HTML/CSS/JS) provides a chat interface.
2. User sends a message (text or voice).
3. The frontend calls the backend endpoint: `POST /chat`.
4. The **FastAPI backend** uses `litellm` to call the AI model via **Groq**.
5. The response is sent back to the frontend.
6. The UI displays the message and optionally speaks it aloud.

7. The UI persists messages in the browser (localStorage) so chat history is restored on refresh.
8. Users can toggle Light/Dark themes; the UI applies smooth transitions and glass effects in both modes.

---

## 🛠️ Tech Stack & Packages

### Backend
- **Python 3**
- **FastAPI** – API framework
- **Uvicorn** – ASGI server
- **litellm** – Unified interface to call LLM providers (Groq used here)
- **python-dotenv** (optional) – For loading environment variables

### Frontend
- **HTML, CSS, JavaScript**
- Browser **SpeechRecognition** (voice input)
- Browser **SpeechSynthesis** (voice output)

### AI / API
- **Groq API** (used via `litellm`)
- Model example: `groq/llama-3.1-8b-instant` (can be changed)

---

## 🔑 API Key Configuration

This project uses a **Groq API key**.

⚠️ **Do NOT hardcode your API key in the code or commit it to GitHub.**

Set it as an environment variable:

### macOS / Linux:
```bash
export GROQ_API_KEY="your_groq_api_key_here"
```

### Windows (PowerShell):
```powershell
setx GROQ_API_KEY "your_groq_api_key_here"
```

Then start the backend:

```bash
uvicorn app:app --reload --app-dir backend
```

The backend will automatically read `GROQ_API_KEY` from the environment.

---

## ▶️ How to Run Locally

1. Install dependencies:
```bash
pip install fastapi uvicorn litellm python-dotenv
```

2. Set your API key (see above).

3. Start backend:
```bash
uvicorn app:app --reload --app-dir backend
```

4. Open the frontend:
- Open `frontend/index.html` in your browser.

5. Start chatting 🎉

---

## 🌍 Deployment

This project is designed to be deployed on platforms like **Render**, **Railway**, or **Cloud Run**.

This project uses **two separate services**:
- 🌐 **Frontend (UI)** is hosted on **Netlify**
- 🤖 **Backend (API)** is hosted on **Render**

The frontend calls the backend API endpoint on Render; this split keeps the UI always online while the API handles AI requests.

Typical steps:
- Add a `requirements.txt`
- Set `GROQ_API_KEY` in the platform’s environment variables
- Start command:
```bash
uvicorn app:app --host 0.0.0.0 --port 10000 --app-dir backend
```

In production, the frontend should call the same origin (e.g., using `window.location.origin`).

The chat history feature is stored in the user's browser (localStorage). This means history persists across reloads on the same device, but not across different devices unless a backend database is added.

---

## 📚 Sources & References

- Official documentation of:
  - FastAPI
  - Uvicorn
  - litellm
  - Groq API
- General web standards:
  - Web Speech API (SpeechRecognition, SpeechSynthesis)
- Design and implementation assisted by AI tools (used as a productivity aid).

---

## 🤝 Notes

- This project was built as a **learning + project showcase**.
- AI tools were used in a **supporting role** (design ideas, debugging help, and code refinement), but the project structure and integration were done manually.
- API keys are **never** stored in the repository.

---

## 📄 License

This project is for educational and demonstration purposes.
You may modify and extend it for your own use.
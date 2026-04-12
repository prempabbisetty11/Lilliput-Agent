from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import os
import litellm

app = FastAPI()

# Allow frontend to call this API from the browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

@app.get("/")
def root():
    return {"status": "ok", "message": "Lilliput Agent backend is running"}

@app.post("/chat")
def chat(req: ChatRequest):
    user_msg = req.message

    # Ensure the Groq API key is set
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in environment variables")

    model_name = os.getenv("MODEL_NAME", "groq/llama-3.1-8b-instant")
    messages = [
        {"role": "system", "content": "You are a helpful AI assistant. Answer clearly and concisely."},
        {"role": "user", "content": user_msg},
    ]

    def extract_text(chunk):
        try:
            choice = chunk.choices[0]
            if hasattr(choice, "delta"):
                delta = choice.delta
                if isinstance(delta, dict):
                    return delta.get("content", "") or ""
                return getattr(delta, "content", "") or ""

            if hasattr(choice, "message"):
                message = choice.message
                if isinstance(message, dict):
                    return message.get("content", "") or ""
                return getattr(message, "content", "") or ""

            return getattr(choice, "text", "") or ""
        except Exception:
            return ""

    def event_stream():
        try:
            completion = litellm.completion(
                model=model_name,
                messages=messages,
                temperature=0.4,
                stream=True,
                timeout=60,
            )

            for chunk in completion:
                text = extract_text(chunk)
                if not text:
                    continue
                yield f"data: {json.dumps({'reply': text})}\n\n"

            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
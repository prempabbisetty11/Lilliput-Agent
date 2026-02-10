from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    user_msg = req.message

    # Ensure the Groq API key is set
    if not os.getenv("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in environment variables")

    try:
        # Call the model via litellm (Groq)
        response = litellm.completion(
            model=os.getenv("MODEL_NAME", "groq/llama-3.1-8b-instant"),
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant. Answer clearly and concisely."},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.4,
        )

        reply_text = response.choices[0].message.content
        return {"reply": reply_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
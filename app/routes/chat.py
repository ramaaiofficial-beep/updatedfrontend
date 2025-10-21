from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import db
import requests
import traceback
import os

# ============================================================
# 🔹 Create the API router
# ============================================================
router = APIRouter(prefix="/chat", tags=["chat"])

# ============================================================
# 🔹 Define request body schema
# ============================================================
class ChatMessage(BaseModel):
    message: str

# ============================================================
# 🔹 Gemini API config
# ============================================================
GEMINI_API_KEY = "AIzaSyAQZRsBJZg40AG208w_pVou0_OISnytYGY"
GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)

headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": GEMINI_API_KEY,
}

# ============================================================
# 🔹 Load Knowledge Base (Fixed Path for backend/data)
# ============================================================
def load_knowledge_file():
    try:
        # Go up two levels from routes → app → backend
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        file_path = os.path.join(base_dir, "data", "rama_ai_knowledge.txt")

        print("📁 Looking for knowledge base at:", file_path)
        print("📁 Current working dir:", os.getcwd())

        if not os.path.exists(file_path):
            print("⚠️ Knowledge base file not found at:", file_path)
            return ""

        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read().strip()

        print(f"✅ Rama AI Knowledge Base Loaded ({len(text)} characters)")
        return text

    except Exception as e:
        print("❌ Error loading knowledge base:", e)
        print(traceback.format_exc())
        return ""

# Load it once at startup
knowledge_text = load_knowledge_file()

# ============================================================
# 🔹 Ask Gemini (with or without context)
# ============================================================
def ask_gemini(prompt: str, use_context: bool = False) -> str:
    if use_context and knowledge_text:
        prompt = f"""
You are Rama AI — an emotionally intelligent AI rooted in Indian culture.

Below is your internal knowledge base:
---
{knowledge_text}
---

Now answer the user's question naturally and helpfully:
"{prompt}"
If the answer is not directly in the knowledge base, respond with your best empathetic and meaningful response.
"""

    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(GEMINI_ENDPOINT, headers=headers, json=payload)
        if response.status_code == 200:
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            print("❌ Gemini API Error:", response.status_code, response.text)
            return f"Gemini API Error: {response.status_code}"
    except Exception:
        print("❌ Gemini API Request Failed")
        print(traceback.format_exc())
        return "Error getting response from Gemini."

# ============================================================
# 🔹 Chat Endpoint
# ============================================================
@router.post("/")
def chat(msg: ChatMessage):
    try:
        print("📩 Incoming message:", msg.message)

        # 1️⃣ Check elder profile
        elder = db.elders.find_one({"name": {"$regex": msg.message, "$options": "i"}})
        if elder:
            profile = {
                "name": elder.get("name"),
                "age": elder.get("age"),
                "email": elder.get("email"),
                "phone": elder.get("phone"),
                "address": elder.get("address", ""),
                "notes": elder.get("notes", ""),
            }
            return {
                "reply": f"Here is the elder profile of {profile['name']}.",
                "profile": profile,
            }

        # 2️⃣ Check younger profile
        younger = db.younger.find_one({"name": {"$regex": msg.message, "$options": "i"}})
        if younger:
            profile = {
                "name": younger.get("name"),
                "age": younger.get("age"),
                "email": younger.get("email"),
                "phone": younger.get("phone"),
                "address": younger.get("address", ""),
                "notes": younger.get("notes", ""),
            }
            return {
                "reply": f"Here is the younger profile of {profile['name']}.",
                "profile": profile,
            }

        # 3️⃣ Use Gemini with knowledge base as context
        print("💡 Using Gemini with knowledge base context...")
        gemini_reply = ask_gemini(msg.message, use_context=True)
        return {"reply": gemini_reply}

    except Exception:
        print("❌ Error occurred in /chat/")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal Server Error")

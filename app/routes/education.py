from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
import PyPDF2
import io
import requests
import logging
import os

router = APIRouter(prefix="/education", tags=["education"])

# ----------------- Logging -----------------
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ----------------- File storage -----------------
UPLOAD_DIR = "uploads"
SONG_DIR = os.path.join(UPLOAD_DIR, "songs")

os.makedirs(SONG_DIR, exist_ok=True)

file_store = {
    "medical": {},  # PDF medical notes (text)
    "stories": {},  # PDF stories (text)
    "songs": {}     # MP3 metadata (just filename → path)
}

# ----------------- Gemini API setup -----------------
GEMINI_API_KEY = "AIzaSyAQZRsBJZg40AG208w_pVou0_OISnytYGY"
GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
HEADERS = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": GEMINI_API_KEY
}

# ----------------- Helpers -----------------
def extract_pdf_text(file_bytes: bytes, filename: str) -> str:
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    except Exception:
        raise HTTPException(status_code=400, detail=f"Failed to read '{filename}' as PDF.")

    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

    if not text.strip():
        raise HTTPException(status_code=400, detail=f"'{filename}' contains no readable text.")
    return text


def call_gemini_api(prompt: str) -> str:
    try:
        response = requests.post(
            GEMINI_ENDPOINT,
            headers=HEADERS,
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=20
        )
        response.raise_for_status()
        data = response.json()
        return (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "Gemini returned no answer.")
        )
    except requests.RequestException as e:
        logger.error(f"Gemini API request failed: {e}")
        raise HTTPException(status_code=500, detail="Gemini API request failed.")

def normalize_name(name: str) -> str:
    return name.lower().replace(".mp3", "").strip()

# ----------------- Upload Endpoint -----------------
@router.post("/upload/{category}")
async def upload_file(category: str, file: UploadFile = File(...)):
    if category not in file_store:
        raise HTTPException(status_code=400, detail="Invalid category: medical, stories, songs.")

    # Validate file type
    if category in ["medical", "stories"] and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files allowed for this category.")
    if category == "songs" and not file.filename.lower().endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Only MP3 files allowed for songs.")

    file_bytes = await file.read()

    if category in ["medical", "stories"]:
        text = extract_pdf_text(file_bytes, file.filename)
        file_store[category][file.filename] = text
    else:
        # Save song to disk
        save_path = os.path.join(SONG_DIR, file.filename)
        with open(save_path, "wb") as f:
            f.write(file_bytes)
        file_store["songs"][file.filename] = save_path

    logger.info(f"✅ Uploaded '{file.filename}' to {category}")

    if category == "songs":
        message = f"✅ Song '{file.filename}' uploaded successfully."
    elif category == "stories":
        message = f"✅ Story '{file.filename}' uploaded. You can now ask me about it!"
    else:
        message = f"✅ File '{file.filename}' uploaded to {category}."

    return JSONResponse(content={"message": message})


# ----------------- Fetch Story -----------------
@router.get("/fetch/story")
async def fetch_story(filename: str):
    if filename not in file_store["stories"]:
        raise HTTPException(status_code=404, detail="Story not found.")
    return {"story": file_store["stories"][filename]}


# ----------------- Fetch Song -----------------
@router.get("/fetch/song")
async def fetch_song(filename: str):
    if filename not in file_store["songs"]:
        raise HTTPException(status_code=404, detail="Song not found.")
    song_path = file_store["songs"][filename]
    return FileResponse(song_path, media_type="audio/mpeg", filename=filename)


# ----------------- Ask Question -----------------
@router.get("/ask")
async def ask_question(
    question: str = Query(..., description="The user's question."),
    filename: str = Query(None, description="Optional PDF filename for context")
):
    """
    Handles Q&A:
      - If user asks to play a song → return its URL.
      - If filename is provided → answer using that file.
      - Otherwise → merge all uploaded docs or fall back to Gemini.
    """

    q_lower = question.lower()

    # ---------- Song playback detection ----------
    if "play" in q_lower and file_store["songs"]:
        for song_name in file_store["songs"].keys():
            if normalize_name(song_name) in q_lower:
                song_url = f"/education/fetch/song?filename={song_name}"
                return {
                    "answer": f"🎵 Playing '{song_name}'...",
                    "song_url": song_url
                }

        song_list = ", ".join(file_store["songs"].keys())
        return {
            "answer": f"🎶 I found these songs: {song_list}. Please specify which one to play."
        }

    # ---------- Document Q&A ----------
    merged_text = ""

    if filename:
        found = False
        for cat in ["medical", "stories"]:
            if filename in file_store[cat]:
                merged_text = file_store[cat][filename]
                found = True
                break
        if not found:
            merged_text = ""
    else:
        for cat in ["medical", "stories"]:
            for fname, text in file_store[cat].items():
                merged_text += f"[{cat.upper()} - {fname}]\n{text[:3000]}\n\n"

    if file_store["songs"]:
        merged_text += "\nUploaded Songs:\n"
        for song_name in file_store["songs"].keys():
            merged_text += f"- {song_name}\n"

    context_info = merged_text.strip() or "No uploaded documents or songs. Use general knowledge."

    prompt = f"""
You are a helpful assistant that can answer questions using uploaded documents or general knowledge.

Context:
\"\"\"{context_info[:16000]}\"\"\" 

Question:
{question}

Answer in a clear and helpful way:
"""

    answer = call_gemini_api(prompt)
    return {"answer": answer}

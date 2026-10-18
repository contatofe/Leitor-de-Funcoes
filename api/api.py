from fastapi import FastAPI, HTTPException, UploadFile, File
from .index import Recognition
from .gemini import recognize_expr

app = FastAPI()
TYPES = {"image/jpeg", "image/png", "image/webp"}
LIMIT = 4 * 1024 * 1024 

@app.post("/api/recognize", response_model=Recognition)
def recognize(photo: UploadFile = File(...)):
    if photo.content_type not in TYPES:
        raise HTTPException(415, "Envie uma imagem JPEG, PNG ou WebP.")
    data = photo.file.read()
    if len(data) > LIMIT:
        raise HTTPException(413, "A imagem passou de 4 MB.")
    try:
        return recognize_expr(data, photo.content_type)
    except Exception:
        raise HTTPException(502, "Não consegui falar com o Gemini. Tente de novo.")
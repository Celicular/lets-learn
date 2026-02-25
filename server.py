import os
import json
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List

from rag_core import load_llm, add_docs, chunk_text, generate_answer, clear_db, generate_flashcards, generate_quiz, generate_topics
from doc_parser import parse_document

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warmup sequence: Load LLM Database mapping & clear vector DB."""
    global llm
    
    print("\n" + "="*50)
    print("🚀 LetsLearn Web Server Starting...")
    print("="*50 + "\n")
    
    print("🔥 Warming up server & booting AI models...")
    
    if not os.path.exists(MODEL_PATH):
        print(f"⚠️ ERROR: Model not found at '{MODEL_PATH}'.")
        print("Please ensure your Mistral model is downloaded before trying to chat.")
    else:
        llm = load_llm(MODEL_PATH)

    print("🧹 Auto-clearing vector DB on startup...")
    clear_db()
    
    projects_data = load_projects_data()
    
    if not projects_data.get("projects"):
        print("\n📝 No projects found. Please create a new project and upload files from the frontend.")
        save_projects_data({"projects": {}})
    else:
        project_count = len(projects_data['projects'])
        projects_names = list(projects_data['projects'].keys())
        print(f"\n📂 Found {project_count} project(s): {', '.join(projects_names)}")
        print("💡 Remember to call /projects/{project_name}/load to inject a project's files into the AI memory.")
        
    yield
    print("\n👋 Shutting down LetsLearn Server...")

app = FastAPI(title="LetsLearn API", description="API for Local RAG study application", lifespan=lifespan)

# Add CORS to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECTS_FILE = "projects.json"
DATA_DIR = "data"
MODELS_DIR = "models"
MODEL_PATH = os.path.join(MODELS_DIR, "mistral.gguf")

# Ensure required directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

llm = None

def load_projects_data():
    """Load projects file mapping."""
    if os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {"projects": {}}
    return {"projects": {}}

def save_projects_data(data):
    """Save to projects file mapping."""
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(data, f, indent=4)



# Models
class ProjectCreate(BaseModel):
    name: str

class ChatRequest(BaseModel):
    query: str

class QuizRequest(BaseModel):
    count: int = 5
    fmt: str = "json"
    topic: str = "all"

class FlashcardRequest(BaseModel):
    count: int = 5
    topic: str = "all"

# Endpoints
@app.get("/projects")
async def get_projects():
    """Returns a list of all projects and their loaded files."""
    return load_projects_data()

@app.post("/projects")
async def create_project(req: ProjectCreate):
    """Creates a tracking space for a newly named project."""
    data = load_projects_data()
    project_name = req.name.strip()
    
    if project_name in data["projects"]:
        raise HTTPException(status_code=400, detail="Project already exists")
    
    data["projects"][project_name] = {"loaded_files": []}
    save_projects_data(data)
    
    # Create the physical folder
    project_dir = os.path.join(DATA_DIR, project_name)
    os.makedirs(project_dir, exist_ok=True)
    
    return {"message": f"Project '{project_name}' created successfully.", "project": project_name}

@app.post("/projects/{project_name}/load")
async def load_project(project_name: str):
    """Clears the Vector DB, then parses all previously uploaded files for this project to inject them."""
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Clear memory so it doesn't overlap with another project's context
    clear_db()
    
    files = data["projects"][project_name]["loaded_files"]
    success_count = 0
    
    for file_path in files:
        if os.path.exists(file_path):
            parsed_text = parse_document(file_path)
            if parsed_text:
                chunks = chunk_text(parsed_text)
                add_docs(chunks, source=os.path.basename(file_path))
                success_count += 1
                
    return {
        "message": f"Project '{project_name}' successfully loaded into active AI memory.", 
        "total_files": len(files),
        "embedded_files": success_count
    }

@app.post("/projects/{project_name}/upload")
async def upload_file(project_name: str, file: UploadFile = File(...)):
    """Uploads a new file directly to a project's folder, saves it, and immediately embeds it."""
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project_dir = os.path.join(DATA_DIR, project_name)
    os.makedirs(project_dir, exist_ok=True) # Failsafe
    
    file_path = os.path.join(project_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update JSON registry mapping
    if file_path not in data["projects"][project_name]["loaded_files"]:
        data["projects"][project_name]["loaded_files"].append(file_path)
        save_projects_data(data)
        
    # Embed the newly uploaded document directly
    parsed_text = parse_document(file_path)
    if parsed_text:
        chunks = chunk_text(parsed_text)
        add_docs(chunks, source=file.filename)
        return {"message": f"File '{file.filename}' uploaded and actively embedded.", "path": file_path}
    else:
        raise HTTPException(status_code=500, detail="Failed to parse text format from document uploaded.")

@app.post("/chat")
async def chat(req: ChatRequest):
    """Streams the real-time AI reply text directly to the frontend based on the currently loaded memory."""
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded. Ensure Mistral model exists.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
        
    def stream_generator():
        stream = generate_answer(llm, req.query)
        for chunk in stream:
            text = chunk["choices"][0].get("text", "")
            if text:
                yield text
                
    return StreamingResponse(stream_generator(), media_type="text/plain")

@app.post("/quiz")
async def generate_quiz_endpoint(req: QuizRequest):
    """Streams a generated quiz strictly formatted as text or JSON."""
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
        
    def stream_generator():
        stream = generate_quiz(llm, req.count, req.fmt, req.topic)
        for chunk in stream:
            text = chunk["choices"][0].get("text", "")
            if text: yield text
            
    return StreamingResponse(stream_generator(), media_type="application/json" if req.fmt == "json" else "text/plain")

@app.post("/flashcards")
async def generate_flashcards_endpoint(req: FlashcardRequest):
    """Streams generated flashcards in Q&A format."""
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
        
    def stream_generator():
        stream = generate_flashcards(llm, req.count, req.topic)
        for chunk in stream:
            text = chunk["choices"][0].get("text", "")
            if text: yield text
            
    return StreamingResponse(stream_generator(), media_type="text/plain")

@app.get("/topics")
async def extract_topics_endpoint():
    """Extracts the most important topics from the active memory context. Returns streaming JSON array."""
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
        
    def stream_generator():
        stream = generate_topics(llm)
        for chunk in stream:
            text = chunk["choices"][0].get("text", "")
            if text: yield text
            
    return StreamingResponse(stream_generator(), media_type="application/json")

# Optional: Run directly with `python server.py`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, log_level="warning")

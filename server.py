import os
import json
import shutil
import asyncio
import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from rag_core import (
    load_llm, add_docs, chunk_text, generate_answer, clear_db,
    generate_flashcards, generate_quiz, generate_topics, generate_summary,
    generate_contextual_answer, route_visual, generate_mermaid, create_sd_prompt, generate_local_image
)
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


os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"


MODEL_NAME = "facebook/nllb-200-distilled-600M"

try:
    print(f"🌍 Loading Translation Model: {MODEL_NAME}...")

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        use_fast=False   # 🔥 critical for NLLB
    )

    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)

    print("✅ Translation Model Ready.")

except Exception as e:
    print(f"⚠️ Could not load translation model: {e}")
    tokenizer = None
    model = None

def en_hi(text):
    if not model or not tokenizer:
        return text

    tokenizer.src_lang = "eng_Latn"

    inputs = tokenizer(text, return_tensors="pt")

    translated_tokens = model.generate(
        **inputs,
        forced_bos_token_id=tokenizer.convert_tokens_to_ids("hin_Deva"),
        max_length=512
    )

    hi = tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
    return hi

def hi_en(text):
    if not model or not tokenizer:
        return text
    tokenizer.src_lang = "hin_Deva"
    inputs = tokenizer(text, return_tensors="pt")
    translated_tokens = model.generate(
        **inputs,
        forced_bos_token_id=tokenizer.convert_tokens_to_ids("eng_Latn"),
        max_length=512
    )
    en = tokenizer.batch_decode(translated_tokens, skip_special_tokens=True)[0]
    return en

llm = None

def load_projects_data():
    """Load projects file mapping with backward compatible cache migration."""
    if os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                return {"projects": {}}
        # Migrate existing projects that don't have a cache key
        changed = False
        for proj in data.get("projects", {}).values():
            if "cache" not in proj:
                proj["cache"] = {"topics": None, "quizzes": {}, "flashcards": {}, "notes": {}, "summary": None}
                changed = True
            elif "notes" not in proj["cache"]:
                proj["cache"]["notes"] = {}
                changed = True
            if "summary" not in proj["cache"]:
                proj["cache"]["summary"] = None
                changed = True
            if "results" not in proj:
                proj["results"] = []
                changed = True
            if "images" not in proj.get("cache", {}):
                proj.setdefault("cache", {})["images"] = {}
                changed = True
            if "mastery" not in proj:
                proj["mastery"] = {}
                changed = True
        if changed:
            save_projects_data(data)
        return data
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
    lang: str = "en"
    k: int = 2
    max_chars: int = 1500

class ContextualChatRequest(BaseModel):
    query: str
    selected_text: str

class QuizRequest(BaseModel):
    count: int = 5
    fmt: str = "json"
    topic: str = "all"

class ResultSaveRequest(BaseModel):
    result: dict

class FlashcardRequest(BaseModel):
    count: int = 5
    topic: str = "all"

class NotesRequest(BaseModel):
    topic: str
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
    
    data["projects"][project_name] = {
        "loaded_files": [],
        "cache": {
            "topics": None,
            "quizzes": {},
            "flashcards": {},
            "notes": {},
            "summary": None
        },
        "results": []
    }
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

import threading
# Global lock to prevent concurrent GGML inference crashing
llm_lock = threading.Lock()

@app.post("/chat")
async def chat(req: ChatRequest, request: Request):
    """Streams the real-time AI reply text directly to the frontend based on the currently loaded memory."""
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded. Ensure Mistral model exists.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
    if llm_lock.locked():
        raise HTTPException(status_code=429, detail="AI is currently processing another request.")
        
    query = req.query
    if req.lang == "hi":
        print(f"🔄 Translating Hindi input to English: {query}")
        query = hi_en(query)
        print(f"✅ Translated: {query}")

    async def stream_generator():
        with llm_lock:
            stream = generate_answer(llm, query, k=req.k, max_chars=req.max_chars)
            for chunk in stream:
                if await request.is_disconnected():
                    print("🛑 [CHAT] Client disconnected, aborting generation.")
                    break
                text = chunk["choices"][0].get("text", "")
                if text:
                    yield text
                
    return StreamingResponse(stream_generator(), media_type="text/plain")


@app.post("/translate")
async def translate(req: dict):
    """Translates English text to Hindi using NLLB. Offloaded to thread to prevent blocking AI stream."""
    hi_text = await asyncio.to_thread(en_hi, req["text"])
    return {"hi": hi_text}


class VisualChatRequest(BaseModel):
    query: str
    project_name: str
    k: int = 2
    max_chars: int = 1500


@app.post("/chat/visual")
async def chat_visual(req: VisualChatRequest, request: Request):
    """Local multimodal streaming chat: text + Mermaid diagram or SD image."""
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if llm_lock.locked():
        raise HTTPException(status_code=429, detail="AI is currently processing another request. Please wait.")

    async def stream():
        import json as _json

        # Step 1 — Route query
        route = route_visual(llm, req.query)

        # Step 2 — Stream the text explanation first
        full_text = ""
        if route in ["text", "diagram"]:
            with llm_lock:
                text_stream = generate_answer(llm, req.query, k=req.k, max_chars=req.max_chars, is_visual=(route == "diagram"))
                for chunk in text_stream:
                    if await request.is_disconnected():
                        print("🛑 [VISUAL CHAT] Client disconnected, aborting generation.")
                        break
                    text = chunk["choices"][0].get("text", "")
                    if text:
                        full_text += text
                        yield _json.dumps({"type": "text", "content": text}) + "\n"

        # Step 3 — Generate Diagram/Image synchronously using the newly generated text context
        if route == "diagram":
            yield _json.dumps({"type": "new_message"}) + "\n"
            mermaid_code = generate_mermaid(llm, req.query, context=full_text)
            if mermaid_code:
                yield _json.dumps({"type": "mermaid", "content": mermaid_code}) + "\n"
        elif route == "visual":
            yield _json.dumps({"type": "text", "content": "🎨 Generating image... (This will take approx 15-20 seconds, please wait!)\n"}) + "\n"
            sd_prompt = create_sd_prompt(llm, req.query)

        # Step 4 — Generate SD Image in the background after text starts/finishes
        if route == "visual" and sd_prompt:
            img_b64 = await asyncio.to_thread(generate_local_image, sd_prompt)
            if img_b64:
                file_path = None
                try:
                    import base64 as _b64
                    images_dir = os.path.join("data", req.project_name, "images")
                    os.makedirs(images_dir, exist_ok=True)
                    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    safe = "".join(c if c.isalnum() else "_" for c in req.query[:30])
                    file_path = os.path.join(images_dir, f"{ts}_{safe}.png")
                    with open(file_path, "wb") as f:
                        f.write(_b64.b64decode(img_b64))
                    data = load_projects_data()
                    if req.project_name in data["projects"]:
                        data["projects"][req.project_name]["cache"]["images"][req.query[:60]] = {
                            "path": file_path, "prompt": sd_prompt,
                            "created_at": datetime.datetime.now().isoformat()
                        }
                        save_projects_data(data)
                except Exception as e:
                    print(f"⚠️ [SD] Save error: {e}")
                yield _json.dumps({"type": "image", "content": img_b64, "path": file_path or ""}) + "\n"
            else:
                yield _json.dumps({"type": "text", "content": "\n*(Image generation unavailable — is ComfyUI running?)*"}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson")


@app.get("/projects/{project_name}/images")
async def list_project_images(project_name: str):
    """Returns all saved image records for a given project."""
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
    images = data["projects"][project_name].get("cache", {}).get("images", {})
    return {"project": project_name, "images": images}

@app.post("/projects/{project_name}/chat/contextual")
async def chat_contextual(project_name: str, req: ContextualChatRequest, request: Request):
    """Streams the real-time AI reply text directly to the frontend based on explicitly selected text."""
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded. Ensure Mistral model exists.")
    if not req.query.strip() or not req.selected_text.strip():
        raise HTTPException(status_code=400, detail="Query and selected_text strings cannot be empty.")
    if llm_lock.locked():
        raise HTTPException(status_code=429, detail="AI is currently processing another request.")
        
    async def stream_generator():
        with llm_lock:
            stream = generate_contextual_answer(llm, req.selected_text, req.query)
            for chunk in stream:
                if await request.is_disconnected():
                    print("🛑 [CONTEXTUAL CHAT] Client disconnected, aborting generation.")
                    break
                text = chunk["choices"][0].get("text", "")
                if text:
                    yield text
                
    return StreamingResponse(stream_generator(), media_type="text/plain")

@app.post("/projects/{project_name}/quiz")
async def generate_quiz_endpoint(project_name: str, req: QuizRequest, request: Request):
    """Generates a quiz for the given project. Smart caching by topic."""
    import random as _random
    print(f"\n📥 [REQUEST] POST /projects/{project_name}/quiz | Count: {req.count} | Topic: '{req.topic}'")
    if not llm:
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    topic_key = req.topic.lower().strip()
    cache = data["projects"][project_name]["cache"]
    
    # Initialize cache pool for topic if not exists
    if topic_key not in cache["quizzes"]:
        cache["quizzes"][topic_key] = []
    
    # Ensure cache is a list (migration if it was a string before)
    if isinstance(cache["quizzes"][topic_key], str):
        try:
            cache["quizzes"][topic_key] = json.loads(cache["quizzes"][topic_key])
        except:
            cache["quizzes"][topic_key] = []

    cached_pool = cache["quizzes"][topic_key]
    
    # Randomization Helper: Shuffle options and return randomized sample
    def finalize_quiz(pool, count):
        sample = _random.sample(pool, min(len(pool), count))
        # Ensure shuffling of options for each question
        final = []
        for q in sample:
            q_copy = q.copy()
            options = q_copy["options"]
            _random.shuffle(options)
            q_copy["options"] = options
            final.append(q_copy)
        return final

    # Case 1: We have enough in cache
    if len(cached_pool) >= req.count:
        print(f"⚡ [CACHE] Returning {req.count} randomized questions from pool ({len(cached_pool)} total)")
        final_quiz = finalize_quiz(cached_pool, req.count)
        return StreamingResponse(iter([json.dumps(final_quiz)]), media_type="application/json")

    # Case 2: Need to generate more
    diff = req.count - len(cached_pool)
    print(f"🧠 [AI] Generating {diff} additional questions for topic: '{topic_key}'")

    extra_context = cache.get("notes", {}).get(topic_key, "") if topic_key != "all" else "\n".join(cache.get("notes", {}).values())

    async def stream_generator():
        full_response = []
        with llm_lock:
            # Generate the difference
            for chunk in generate_quiz(llm, diff, "json", req.topic, extra_context=extra_context):
                if await request.is_disconnected():
                    print("🛑 [QUIZ] Client disconnected, aborting generation.")
                    return # Exit generator early
                text = chunk["choices"][0].get("text", "")
                if text:
                    full_response.append(text)
                
        # Parse new questions and update cache
        try:
            raw_new = "".join(full_response)
            import re as _re
            # More robust regex to find JSON array even if LLM adds fluff
            match = _re.search(r'\[\s*\{.*\}\s*\]', raw_new, _re.DOTALL)
            if match:
                new_qs = json.loads(match.group(0))
                # Add to pool
                updated_data = load_projects_data()
                updated_pool = updated_data["projects"][project_name]["cache"]["quizzes"].get(topic_key, [])
                if isinstance(updated_pool, str): updated_pool = []
                updated_pool.extend(new_qs)
                updated_data["projects"][project_name]["cache"]["quizzes"][topic_key] = updated_pool
                save_projects_data(updated_data)
                
                # Combine original cache + new and return requested count
                combined = cached_pool + new_qs
                final_quiz = finalize_quiz(combined, req.count)
                yield json.dumps(final_quiz)
            else:
                print("⚠️ [QUIZ] Failed to find valid JSON array in LLM response.")
                yield json.dumps(finalize_quiz(cached_pool, req.count)) # Return whatever we have in cache
        except Exception as e:
            print(f"❌ [ERROR] Cache update failed: {e}")
            yield "".join(full_response) # Fallback to raw if logic fails

    return StreamingResponse(stream_generator(), media_type="application/json")

@app.post("/projects/{project_name}/flashcards")
async def generate_flashcards_endpoint(project_name: str, req: FlashcardRequest, request: Request):
    """Generates flashcards for the given project. Caches result by topic (not 'all')."""
    print(f"\n📥 [REQUEST] POST /projects/{project_name}/flashcards | Count: {req.count} | Topic: '{req.topic}'")
    if not llm:
        print("❌ [ERROR] LLM is not loaded.")
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    topic_key = req.topic.lower().strip()
    cache = data["projects"][project_name]["cache"]

    if topic_key in cache["flashcards"]:
        print(f"⚡ [CACHE] Returning cached flashcards for topic: '{topic_key}'")
        cached = cache["flashcards"][topic_key]
        return StreamingResponse(iter([cached]), media_type="text/plain")

    extra_context = ""
    if topic_key == "all":
        extra_context = "\n".join(cache.get("notes", {}).values())
    else:
        extra_context = cache.get("notes", {}).get(topic_key, "")

    async def stream_generator():
        full_response = []
        with llm_lock:
            for chunk in generate_flashcards(llm, req.count, req.topic, extra_context=extra_context):
                if await request.is_disconnected():
                    print("🛑 [FLASHCARDS] Client disconnected, aborting generation.")
                    break
                text = chunk["choices"][0].get("text", "")
                if text:
                    full_response.append(text)
                    yield text
        result = data.copy()
        result["projects"][project_name]["cache"]["flashcards"][topic_key] = "".join(full_response)
        save_projects_data(result)
        print(f"💾 [CACHE] Saved flashcards for topic: '{topic_key}'")

    return StreamingResponse(stream_generator(), media_type="text/plain")

@app.post("/projects/{project_name}/notes")
async def generate_notes_endpoint(project_name: str, req: NotesRequest, request: Request):
    """Generates study notes for the given topic. Caches result by topic."""
    from rag_core import generate_notes
    print(f"\n📥 [REQUEST] POST /projects/{project_name}/notes | Topic: '{req.topic}'")
    if not llm:
        print("❌ [ERROR] LLM is not loaded.")
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    topic_key = req.topic.lower().strip()
    cache = data["projects"][project_name]["cache"]

    if topic_key in cache["notes"]:
        print(f"⚡ [CACHE] Returning cached notes for topic: '{topic_key}'")
        cached = cache["notes"][topic_key]
        return StreamingResponse(iter([cached]), media_type="text/plain")

    async def stream_generator():
        full_response = []
        with llm_lock:
            for chunk in generate_notes(llm, req.topic):
                if await request.is_disconnected():
                    print("🛑 [NOTES] Client disconnected, aborting generation.")
                    break
                text = chunk["choices"][0].get("text", "")
                if text:
                    full_response.append(text)
                    yield text
        result = load_projects_data() # Reload to avoid race conditions
        result["projects"][project_name]["cache"]["notes"][topic_key] = "".join(full_response)
        save_projects_data(result)
        print(f"💾 [CACHE] Saved notes for topic: '{topic_key}'")

    return StreamingResponse(stream_generator(), media_type="text/plain")

@app.get("/projects/{project_name}/topics")
async def extract_topics_endpoint(project_name: str, request: Request, check_cached: bool = False):
    """Extracts key topics from the project memory. Caches result per project."""
    print(f"\n📥 [REQUEST] GET /projects/{project_name}/topics | Check Cached: {check_cached}")
    if not llm:
        print("❌ [ERROR] LLM is not loaded.")
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    cache = data["projects"][project_name]["cache"]

    if check_cached:
        if cache["topics"] is not None:
            print(f"⚡ [CACHE] Returning cached topics for project: '{project_name}'")
            return StreamingResponse(iter([cache["topics"]]), media_type="application/json")
        else:
            print(f"⏭️ [CACHE] No cached topics found for '{project_name}', returning empty list as check_cached=True")
            return StreamingResponse(iter(["[]"]), media_type="application/json")

    async def stream_generator():
        full_response = []
        with llm_lock:
            for chunk in generate_topics(llm):
                if await request.is_disconnected():
                    print("🛑 [TOPICS] Client disconnected, aborting generation.")
                    break
                text = chunk["choices"][0].get("text", "")
                if text:
                    full_response.append(text)
                    yield text
        result = load_projects_data()
        result["projects"][project_name]["cache"]["topics"] = "".join(full_response)
        save_projects_data(result)
        print(f"💾 [CACHE] Saved topics for project: '{project_name}'")

    return StreamingResponse(stream_generator(), media_type="application/json")


@app.post("/projects/{project_name}/summary")
async def generate_summary_endpoint(project_name: str, request: Request):
    """Generates a summary for all uploaded documents in a project. Caches the result."""
    from rag_core import generate_summary
    print(f"\n📥 [REQUEST] POST /projects/{project_name}/summary")
    if not llm:
        print("❌ [ERROR] LLM is not loaded.")
        raise HTTPException(status_code=500, detail="LLM is not loaded.")
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")

    cache = data["projects"][project_name]["cache"]

    if cache.get("summary"):
        print(f"⚡ [CACHE] Returning cached summary for project: '{project_name}'")
        cached = cache["summary"]
        return StreamingResponse(iter([cached]), media_type="text/plain")

    async def stream_generator():
        full_response = []
        with llm_lock:
            for chunk in generate_summary(llm):
                if await request.is_disconnected():
                    print("🛑 [SUMMARY] Client disconnected, aborting generation.")
                    break
                text = chunk["choices"][0].get("text", "")
                if text:
                    full_response.append(text)
                    yield text
        result = load_projects_data()
        result["projects"][project_name]["cache"]["summary"] = "".join(full_response)
        save_projects_data(result)
        print(f"💾 [CACHE] Saved summary for project: '{project_name}'")

    return StreamingResponse(stream_generator(), media_type="text/plain")

@app.post("/projects/{project_name}/results")
async def save_project_results(project_name: str, req: ResultSaveRequest):
    """Saves a quiz result to the project's history."""
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if "results" not in data["projects"][project_name]:
        data["projects"][project_name]["results"] = []
        
    data["projects"][project_name]["results"].append(req.result)
    
    # Update Mastery Stats
    if "breakdown" in req.result:
        mastery = data["projects"][project_name].setdefault("mastery", {})
        time_spent = req.result.get("time_spent", 0)
        total_questions = req.result.get("total", 0)

        for topic, stats in req.result["breakdown"].items():
            if topic == "all": continue
            
            # Attribute time proportionally to number of questions per topic in multi-topic sessions
            topic_time = (stats["total"] / total_questions) * time_spent if total_questions > 0 else 0
            
            t_data = mastery.setdefault(topic, {
                "attempted": 0, "correct": 0, "accuracy": 0, 
                "total_time": 0, "avg_speed": 0, "last_attempt": None
            })
            
            t_data["attempted"] += stats["total"]
            t_data["correct"] += stats["correct"]
            t_data["accuracy"] = round((t_data["correct"] / t_data["attempted"]) * 100)
            
            # Update total time and speed (Questions per Minute)
            t_data["total_time"] = round(t_data.get("total_time", 0) + topic_time)
            if t_data["total_time"] > 0:
                # Questions Per Minute calculation
                current_speed = round((t_data["attempted"] / t_data["total_time"]) * 60, 1)
                t_data["avg_speed"] = current_speed
                
                # Track best speed (peak performance)
                t_data["best_speed"] = max(t_data.get("best_speed", 0), current_speed)
                
            t_data["last_attempt"] = datetime.datetime.now().isoformat()
            
    save_projects_data(data)
    return {"message": "Result saved successfully"}

@app.get("/projects/{project_name}/mastery")
async def get_project_mastery(project_name: str):
    """Returns the mastered topics and accuracy for the heatmap."""
    data = load_projects_data()
    if project_name not in data["projects"]:
        raise HTTPException(status_code=404, detail="Project not found")
        
    mastery = data["projects"][project_name].get("mastery", {})
    
    # Add intensity level for frontend
    enriched = {}
    for topic, d in mastery.items():
        acc = d["accuracy"]
        level = "weak"
        if acc > 80: level = "mastered"
        elif acc > 60: level = "good"
        elif acc > 30: level = "practice"
        
        enriched[topic] = {
            **d,
            "level": level
        }
        
    return {"project": project_name, "mastery": enriched}
# Optional: Run directly with `python server.py`
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, log_level="info")

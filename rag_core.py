import os
import json
import chromadb
import logging
import warnings

# Strictly disable HuggingFace network calls and warnings (Forces fully offline mode)
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1" 
os.environ["TOKENIZERS_PARALLELISM"] = "false"

warnings.filterwarnings("ignore", category=UserWarning)

# Suppress sentence_transformers / transformers load reporting
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("sentence_transformers").setLevel(logging.ERROR)

from llama_cpp import Llama
import llama_cpp
from sentence_transformers import SentenceTransformer
import transformers

transformers.logging.set_verbosity_error()

def check_gpu_support():
    """Checks if llama-cpp-python was correctly compiled with CUDA/GPU support."""
    try:
        # Depending on the version, standard method to check
        supports_gpu = llama_cpp.llama_supports_gpu_offload()
        if supports_gpu:
            print("🟢 [HARDWARE] CUDA/GPU Acceleration is ENABLED and WORKING!")
        else:
            print("🔴 [HARDWARE] WARNING: Running in SLOW CPU Mode. (GPU wheel not detected)")
    except AttributeError:
        print("🟡 [HARDWARE] Unknown acceleration status (old llama-cpp version)")


def load_llm(model_path="models/mistral.gguf"):
    if not os.path.exists(model_path):
        print(f"Warning: Model not found at {model_path}.")
        return None
        
    check_gpu_support()
    print("Loading LLM...")
    return Llama(
        model_path=model_path,
        n_gpu_layers=25,   # Offload exactly 25 layers (~3.5GB) to fit RTX 2050 4GB VRAM limit
        n_ctx=8192,        # Fast 8K semantic context window
        n_threads=4,       # Standard optimal threads
        n_batch=512,       # Massive prompt batching speedup due to GPU cores
        use_mlock=False,   
        flash_attn=True,   
        verbose=False
    )


# Initialize embedder silently
embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")


def embed(texts):
    return embedder.encode(texts, normalize_embeddings=True).tolist()


db_path = os.path.join(os.path.dirname(__file__), "chroma_db")
client = chromadb.PersistentClient(path=db_path)
logging.getLogger("chromadb").setLevel(logging.ERROR)
collection = client.get_or_create_collection("letslearn")


def add_docs(chunks, source="manual_add"):
    if not chunks:
        print(f"⚠️  [RAG] No chunks to embed for source: {source}")
        return
    print(f"🚀 [RAG] Embedding {len(chunks)} chunks from source: {source}...")
    vectors = embed(chunks)
    start_id = collection.count()
    ids = [f"doc_{start_id + i}" for i in range(len(chunks))]
    metadatas = [{"source": source} for _ in chunks]
    collection.add(
        documents=chunks,
        embeddings=vectors,
        metadatas=metadatas,
        ids=ids
    )
    print(f"✅ [RAG] Successfully embedded into Vector DB. Total docs now: {collection.count()}")

def clear_db():
    global collection
    client.delete_collection("letslearn")
    collection = client.create_collection("letslearn")
    print("🗑️  Vector Database cleared.")


def chunk_text(text, size=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + size])
        start += size - overlap
    return chunks


def retrieve(query, k=2):
    print(f"🔍 [RAG] Searching memory for: '{query}'")
    if collection.count() == 0:
        print("⚠️  [RAG] Vector DB is empty. Returning NO context.")
        return []
        
    q_emb = embed([query])[0]
    results = collection.query(query_embeddings=[q_emb], n_results=k)
    
    if results and results["documents"]:
        retrieved_docs = results["documents"][0]
        print(f"💡 [RAG] Found {len(retrieved_docs)} relevant context snippet(s).")
        return retrieved_docs
        
    print("⚠️  [RAG] No relevant context found.")
    return []


def _get_context(query="", limit=10, max_chars=3000, k=2):
    if collection.count() == 0:
        return ""
    
    if query:
        docs = retrieve(query, k=k)
    else:
        res = collection.get(limit=limit)
        docs = res.get("documents", [])
        
    context = "\n\n---\n\n".join(docs) if docs else ""
    return context[:max_chars] if len(context) > max_chars else context


def route_visual(llm, query: str) -> str:
    """Mistral classifies query into 'diagram', 'visual', or 'text'."""
    prompt = f"""[INST] Classify this student query into exactly one label:

diagram → flowchart, process, architecture, system, lifecycle, pipeline, structure
visual → explicit request for an image, picture, photo, scene, realistic image, concept art, illustration
text → explanation, definition, comparison, factual question

CRITICAL OVERRIDE: If the user explicitly asks for an "image", "picture", or "photo", you MUST output 'visual'.

Student query: "{query}"

Reply with ONLY one word: diagram, visual, or text.
[/INST]"""
    try:
        # Added temperature=0.1 for high determinism and dot as a stopping char
        result = llm.create_completion(prompt, max_tokens=5, temperature=0.1, stop=["</s>", "[INST]", "\n", ".", ","])
        raw_text = result["choices"][0].get("text", "text").strip().lower()

        route = "text"
        if "diagram" in raw_text:
            route = "diagram"
        elif "visual" in raw_text:
            route = "visual"

        print(f"🤖 [AGENT] Route → {route}")
        return route
    except Exception as e:
        print(f"⚠️ [AGENT] Router error: {e}")
    return "text"


def generate_mermaid(llm, query: str, context: str = "") -> str:
    """
    Generate a valid Mermaid flowchart using Mistral.
    Includes cleaning + validation + fallback.
    """

    context_block = (
        f"\nUse this exact explanation as context for the diagram to ensure perfect synchronization:\n{context}\n"
        if context else ""
    )

    prompt = f"""[INST]
You output ONLY Mermaid flowchart syntax.

STRICT RULES (never break):

STRUCTURE
1. Start with EXACT text: flowchart TD
2. First declare ALL nodes.
3. After node declarations, declare ALL edges.
4. Never mix node declarations and edges.

NODE RULES
5. Use short IDs only: A, B, C, D, N1, N2
6. Declare each node EXACTLY once using: A[Label]
7. Node labels = 1–3 simple words only
8. Node labels must NOT contain commas, punctuation, parentheses, or quotes
9. NEVER create nodes inside edges (FORBIDDEN: A --> B[Label])

EDGE RULES
10. Edges must use ONLY node IDs: A --> B
11. One edge per line ONLY
12. Allowed edge formats ONLY:
    A --> B
    A -->|Label| B
13. Edge labels = 1–2 simple words ONLY
14. Edge labels must NOT contain commas, punctuation, or symbols
15. NO chained edges (FORBIDDEN: A --> B --> C)

FORBIDDEN SYNTAX
16. <--> , -- label --> , --x--> , -.-> , ==>
17. Multiple arrows in one line
18. Self loops unless essential

OUTPUT RULE
19. Output raw Mermaid only
20. No explanations, no markdown, no extra text

Student query: {query}
Context: {context}
[/INST]"""

    try:
        result = llm.create_completion(
            prompt,
            max_tokens=400,
            temperature=0.2,
            stop=["</s>", "[INST]"]
        )

        raw = result["choices"][0].get("text", "").strip()

        # ---- CLEANING ----
        raw = raw.replace("```mermaid", "").replace("```", "").strip()
        print(f"\n[MERMAID RAW (PRE-VALIDATION)]:\n{raw}\n---------------------")

        # Extract only Mermaid lines
        lines = raw.splitlines()
        keep = []
        started = False

        import re
        
        for line in lines:
            line = line.strip()

            if line.startswith("flowchart") or line.startswith("graph"):
                started = True

            # Auto-inject graph declaration if LLM forgot it and jumped straight to nodes
            if not started and line and ("-->" in line or ("[" in line and "]" in line)):
                keep.append("flowchart LR")
                started = True

            if started:
                # Stop parsing if the LLM starts adding notes underneath
                if line.startswith("Note:") or line.startswith("Here"):
                    break
                
                # Auto-correct invalid conversational arrow labels (e.g. A -- label --> B converted to A -->|label| B)
                # Matches A -- label --> B
                line = re.sub(r'--\s*([^-<>|]+)\s*-->', r'-->|\1|', line)
                # Matches A --<-- Data --> B
                line = re.sub(r'--<--\s*([^-<>|]+)\s*-->', r'-->|\1|', line)
                # Remove random bidirectional arrows 
                line = line.replace("<-->", "-->").replace("<-", "")
                
                # Check for bad node definition formats LLM often outputs like 'I[Data Cubes]: Some text'
                if not line.startswith("flowchart") and not line.startswith("graph"):
                    # Include if it has an edge
                    if "-->" in line or "-.->" in line or "==>" in line:
                        keep.append(line)
                    # Include if it is a simple node declaration (e.g. A[Label]) and NOT followed by colon-separated text
                    elif "[" in line and "]" in line and ":" not in line.split("]")[1]:
                        keep.append(line)
                    elif line == "":
                        keep.append(line)
                else:
                    keep.append(line)

        code = "\n".join(keep).strip()
        print(f"[MERMAID CLEANED (POST-PARSING)]:\n{code}\n---------------------")

        # ---- VALIDATION ----
        if not code.startswith("flowchart") and not code.startswith("graph"):
            raise ValueError("Invalid Mermaid output (missing flowchart/graph declaration)")

        if "-->" not in code:
            raise ValueError("No edges detected")

        print(f"📊 [MERMAID] Generated diagram ({len(code)} chars):\n{code}\n")
        return code

    except Exception as e:
        print(f"⚠️ [MERMAID] Generation error: {e}")

        # ---- FALLBACK (guaranteed valid) ----
        fallback = """flowchart LR
A[Input Data] --> B[Processing]
B --> C[Analysis]
C --> D[Output]
"""
        return fallback


def create_sd_prompt(llm, query: str) -> str:
    """Ask Mistral to engineer a Stable Diffusion image prompt."""
    prompt = f"""[INST] Convert this student question into a Stable Diffusion image prompt.

Make it visually descriptive, educational, minimalist style, white background, labeled diagram.
Student question: "{query}"

Return ONLY the image prompt. No preamble.
[/INST]"""
    try:
        result = llm.create_completion(prompt, max_tokens=200, stop=["</s>", "[INST]"])
        return result["choices"][0].get("text", query).strip()
    except Exception as e:
        print(f"⚠️ [SD] Prompt error: {e}")
        return f"Educational diagram illustrating: {query}. Clean, labeled, white background."


def generate_local_image(prompt: str) -> str | None:
    """Generate an image via local ComfyUI API. Returns base64 PNG or None if offline."""
    import requests, base64 as _base64, time
    COMFYUI_URL = "http://127.0.0.1:8188"
    try:
        import random
        payload = {
            "prompt": {
                "3": {"class_type": "KSampler", "inputs": {"cfg": 6, "denoise": 1, "latent_image": ["5", 0], "model": ["4", 0], "negative": ["7", 0], "positive": ["6", 0], "sampler_name": "dpmpp_2m_sde", "scheduler": "karras", "seed": random.randint(1, 99999999999999), "steps": 16}},
                "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "dreamshaperXL_lightningDPMSDE.safetensors"}},
                "5": {"class_type": "EmptyLatentImage", "inputs": {"batch_size": 1, "height": 1024, "width": 1024}},
                "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 1], "text": prompt}},
                "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 1], "text": "blurry, ugly, low quality, text, watermark"}},
                "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
                "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "letslearn_", "images": ["8", 0]}}
            }
        }
        r = requests.post(f"{COMFYUI_URL}/prompt", json=payload, timeout=5)
        prompt_id = r.json().get("prompt_id")
        if not prompt_id:
            return None
        for _ in range(60):
            time.sleep(2)
            history = requests.get(f"{COMFYUI_URL}/history/{prompt_id}", timeout=5).json()
            if prompt_id in history:
                for node_out in history[prompt_id].get("outputs", {}).values():
                    for img_data in node_out.get("images", []):
                        img_bytes = requests.get(f"{COMFYUI_URL}/view", params={"filename": img_data["filename"], "subfolder": img_data.get("subfolder", ""), "type": "output"}, timeout=10).content
                        return _base64.b64encode(img_bytes).decode("utf-8")
        return None
    except requests.exceptions.ConnectionError:
        print("⚠️ [SD] ComfyUI offline — skipping image generation")
    except Exception as e:
        print(f"⚠️ [SD] Error: {e}")
    return None


def generate_answer(llm, query, k=2, max_chars=1500, is_visual=False):

    print(f"\n💬 [CLIENT] Asked Question: {query}")
    context = _get_context(query, max_chars=max_chars, k=k)
    
    if not context.strip() and not is_visual:
        print("⚠️  [LLM] No context available, returning fallback error.")
        yield {"choices": [{"text": "I can't answer this because the database is empty. Please use /add or /load first."}]}
        return

    print(f"🤖 [LLM] Generating answer from {len(context)} characters of context...")
    print("--------------------------------------------------")
    print("📢 [AI REPLY STREAMING TO WEBSERVER]: ", end="")
    
    # If a diagram/image is needed, instruct the LLM to give a structural explanation that will be used to build a diagram, preventing apologies.
    question_text = query
    if is_visual:
        question_text = f"Explain the core concepts of this topic: '{query}'. Provide a highly structural explanation. CRITICAL: DO NOT mention that you cannot draw diagrams or images. NEVER apologize. Just explain the concepts directly and factually without any prelude."
    prompt = f"""[INST] You are a friendly AI tutor and a supportive friend. 

PERSONALITY:
- Talk to the student like a close friend—be warm, encouraging, and empathetic.
- Answer personal questions (e.g., about your "day" or the student's feelings) in a supportive, friendly way.

STRICT STUDY FOCUS:
- If the user asks for jokes, games, or any non-study distractions, you MUST reply ONLY with: "cant joke.. its study time you cant loose focus..".
- CRITICAL: After giving this refusal, DO NOT add anything else. DO NOT ask a random question. Just stop.

CRITICAL RULES:
1. NEVER apologize or state "I am an AI...".
2. NEVER mention that you cannot generate images, diagrams, or flowcharts.
3. Start answering immediately. Do not use filler introduction sentences like "Here is the explanation...".
4. If formatting instructions are given, follow them strictly!

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>

Question: {question_text}
[/INST]"""
    # use yield from to properly pass the generator
    for chunk in llm.create_completion(prompt, max_tokens=800, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)  # Mirror word-by-word into terminal
        yield chunk
    
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished generating answer.")


def generate_flashcards(llm, count: int = 5, topic: str = "all", extra_context: str = ""):
    context = _get_context(topic if topic != "all" else "")
    if extra_context:
        context = f"NOTES/EXTRACTED CONTEXT:\n{extra_context}\n\nDOCUMENT CONTENT:\n{context}"
        
    if not context.strip():
        print(f"⚠️ [RAG] Warning: No document context found for topic '{topic}'. Falling back to LLM knowledge.")

    topic_instruction = f"CRITICAL: Focus ONLY on the topic: '{topic}'. Keep the flashcards strictly relevant to this topic based on the context." if topic != "all" else "Cover all topics in the context."
        
    prompt = f"""[INST] You are an expert educator. Extract exactly {count} distinct facts from the DOCUMENT CONTENT below and turn them into flashcards.
{topic_instruction}
CRITICAL INSTRUCTIONS:
- You should primarily use the provided DOCUMENT CONTENT to extract facts.
- IMPORTANT FALLBACK: If the provided DOCUMENT CONTENT is empty, sparse, or just a syllabus outline, you MUST use your own expert knowledge to generate detailed, factual flashcards for the specified topic to reach exactly {count} flashcards.
- DO NOT refuse to generate flashcards. Do not apologize. Just output the flashcards.

Format each flashcard exactly as:
Q: <question>
A: <answer>

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    print(f"\n📢 [AI GENERATING FLASHCARDS STREAMING TO WEBSERVER]: ", end="")
    for chunk in llm.create_completion(prompt, max_tokens=1200, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)
        yield chunk
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished generating flashcards.")


def generate_quiz(llm, count: int = 5, fmt: str = "text", topic: str = "all", extra_context: str = ""):
    context = _get_context(topic if topic != "all" else "")
    if extra_context:
        context = f"NOTES/EXTRACTED CONTEXT:\n{extra_context}\n\nDOCUMENT CONTENT:\n{context}"
        
    if not context.strip():
        print(f"⚠️ [RAG] Warning: No document context found for topic '{topic}'. Falling back to LLM knowledge.")

    topic_instruction = f"CRITICAL: Focus ONLY on the topic: '{topic}'. Keep the questions strictly relevant to this topic based on the context." if topic != "all" else "Cover all topics in the context."

    if fmt == "json":
        format_instruction = """Return ONLY a valid JSON array in this exact format. The 'options' array must have exactly 4 separate string items. DO NOT prefix options with A, B, C, D. The FIRST item in the options array MUST ALWAYS be the correct answer. You MUST include an "answer" field containing the exact text of the correct answer.

[
  {
    "question": "...",
    "options": [
      "Correct answer text",
      "Wrong answer text 1",
      "Wrong answer text 2",
      "Wrong answer text 3"
    ],
    "answer": "Correct answer text"
  }
]"""
    else:
        format_instruction = """Format each question as shown below. DO NOT use A, B, C, D prefixes. The FIRST bullet point MUST ALWAYS be the correct answer.

Q<n>: <question>
- <Correct answer>
- <Wrong answer>
- <Wrong answer>
- <Wrong answer>"""

    prompt = f"""[INST] You are an expert quiz generator. Your absolute priority is to create exactly {count} multiple-choice questions.
{topic_instruction}

CRITICAL INSTRUCTIONS:
- Generate ONLY conceptual, technical, or analytical questions.
- STRICTLY FORBIDDEN: Do not generate questions about books, authors, references, syllabus structure, page numbers, or administrative details.
- IF the provided DOCUMENT CONTENT is useful, base your questions on it.
- IF the provided DOCUMENT CONTENT is empty, sparse, mostly an outline, or lacks enough detail for {count} questions, you MUST completely IGNORE IT and rely entirely on your own expert knowledge.
- UNDER NO CIRCUMSTANCES should you refuse to generate the quiz. It is STRICTLY FORBIDDEN to output an empty array (e.g., []).
- Ensure all questions are highly relevant, educational, and accurately match the required JSON or text format.

{format_instruction}

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    print(f"\n📢 [AI GENERATING QUIZ STREAMING TO WEBSERVER]: ", end="")
    for chunk in llm.create_completion(prompt, max_tokens=2000, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)
        yield chunk
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished generating quiz.")


def generate_topics(llm):
    """Summarizes the uploaded documents into a list of key topics."""
    context = _get_context(limit=10, max_chars=3000)
        
    if not context.strip():
        yield {"choices": [{"text": "[]"}]}
        return
        
    prompt = f"""[INST] You are an expert analyst. Read the DOCUMENT CONTENT below and extract the 5 to 10 most important key topics or themes.
Return ONLY a valid JSON array of strings. No other text or markdown.

Example: ["Topic 1", "Topic 2", "Topic 3"]

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    print(f"\n📢 [AI GENERATING TOPICS STREAMING TO WEBSERVER]: ", end="")
    for chunk in llm.create_completion(prompt, max_tokens=300, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)
        yield chunk
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished generating topics.")

def generate_notes(llm, topic: str):
    """Generates a detailed markdown study guide for a specific topic."""
    context = _get_context(topic)
        
    if not context.strip():
        yield {"choices": [{"text": "No documents found in the database covering this topic."}]}
        return
        
    prompt = f"""[INST] You are an expert tutor. Based on the DOCUMENT CONTENT below, generate highly detailed and comprehensive study notes exclusively about the topic: '{topic}'.
Format the notes strictly using Github Flavored Markdown (GFM). 

CRITICAL FORMATTING RULES:
- IMPORTANT: DO NOT wrap your entire response inside ```markdown or ``` tags. Start your response directly with the # title.
- Use # for the main title, ## for sections, and ### for subsections.
- DO NOT wrap standard text, headings, or bullet points in triple backticks (```).
- ONLY use code blocks (```) if you are providing a snippet of actual programming code or raw data formatting.
- Use properly formatted GFM tables for structured data (e.g. | Header | Header |).
- Use - or * for bullet points. Ensure high information density.
- Use **bold** and _italics_ for emphasis.

INSTRUCTIONS:
- You must ONLY use the provided DOCUMENT CONTENT.
- Do NOT make up external information.
- Ensure the output is valid Markdown that can be parsed by standard GFM parsers.
- Make it visually appealing and well-structured.

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    print(f"\n📢 [AI GENERATING NOTES STREAMING TO WEBSERVER]: ", end="")
    for chunk in llm.create_completion(prompt, max_tokens=1500, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)
        yield chunk
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished generating notes.")


def generate_summary(llm):
    """Generates a structured markdown summary of all uploaded documents."""
    context = _get_context(limit=20, max_chars=4000)
        
    if not context.strip():
        yield {"choices": [{"text": "No documents found in the database. Please use /add or /load first."}]}
        return
        
    prompt = f"""[INST] You are an expert analyst. Read the COMPLETE DOCUMENT CONTENT below and generate a high-level, comprehensive summary of all the material.
Format the summary strictly using Github Flavored Markdown (GFM).

CRITICAL FORMATTING RULES:
- IMPORTANT: DO NOT wrap your entire response inside ```markdown or ``` tags. Start your response directly with the # title.
- Use # for the main title, ## for sections, and ### for subsections.
- DO NOT wrap standard text, headings, or bullet points in triple backticks (```).
- ONLY use code blocks (```) if you are providing a snippet of actual programming code or raw data formatting.
- Use properly formatted GFM tables for structured data (e.g. | Header | Header |).
- Use - or * for bullet points.
- Use **bold** and _italics_ for emphasis.

INSTRUCTIONS:
- You must ONLY use the provided DOCUMENT CONTENT.
- Do NOT make up external information.
- Ensure the output is valid Markdown that can be parsed by standard GFM parsers.
- Make it visually appealing and well-structured.

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    print(f"\n📢 [AI GENERATING SUMMARY STREAMING TO WEBSERVER]: ", end="")
    for chunk in llm.create_completion(prompt, max_tokens=1500, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)
        yield chunk
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished generating summary.")

def generate_contextual_answer(llm, selected_text: str, question: str):
    """Answers a specific doubt based explicitly on a selected piece of text."""
    prompt = f"""[INST] You are a highly intelligent tutor. The user is reading their study material and has highlighted the following text:

<SELECTED_TEXT>
{selected_text}
</SELECTED_TEXT>

The user has a doubt/question regarding this exact text:
"{question}"

Provide a clear, helpful, and concise answer to their question using the provided text. Don't mention "based on the selected text", just answer the question in a friendly tone. Use markdown if helpful. [/INST]"""
    
    print(f"\n📢 [AI CONTEXTUAL CHAT STREAMING]: ", end="")
    for chunk in llm.create_completion(prompt, max_tokens=1000, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)
        yield chunk
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished contextual answer.")


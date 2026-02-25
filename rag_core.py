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


def retrieve(query, k=5):
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


def _get_context(query=""):
    if collection.count() == 0:
        return ""
    
    if query:
        docs = retrieve(query)
    else:
        # If no query provided (e.g. general flashcards), just grab some documents
        # Because we can't search an empty string efficiently, we use .get()
        res = collection.get(limit=5)
        docs = res.get("documents", [])
        
    return "\n\n---\n\n".join(docs) if docs else ""


def generate_answer(llm, query):
    print(f"\n💬 [CLIENT] Asked Question: {query}")
    context = _get_context(query)
    
    if not context.strip():
        print("⚠️  [LLM] No context available, returning fallback error.")
        yield {"choices": [{"text": "I can't answer this because the database is empty. Please use /add or /load first."}]}
        return

    print(f"🤖 [LLM] Generating answer from {len(context)} characters of context...")
    print("--------------------------------------------------")
    print("📢 [AI REPLY STREAMING TO WEBSERVER]: ", end="")
    prompt = f"""[INST] You are an expert AI answering questions based strongly on the documents provided.
Answer the question using ONLY the provided document context below.
CRITICAL: Do NOT use outside knowledge. If the provided documents do not contain the answer, reply exactly with: "I cannot answer this based on the provided documents."

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>

Question: {query}
[/INST]"""
    # use yield from to properly pass the generator
    for chunk in llm.create_completion(prompt, max_tokens=800, stop=["</s>", "[INST]"], stream=True):
        text = chunk["choices"][0].get("text", "")
        if text:
            print(text, end="", flush=True)  # Mirror word-by-word into terminal
        yield chunk
    
    print("\n--------------------------------------------------")
    print("✅ [LLM] Finished generating answer.")


def generate_flashcards(llm, count: int = 5, topic: str = "all"):
    context = _get_context(topic if topic != "all" else "")
        
    if not context.strip():
        yield {"choices": [{"text": "No documents found in the database. Please use /add or /load first."}]}
        return

    topic_instruction = f"CRITICAL: Focus ONLY on the topic: '{topic}'. Keep the flashcards strictly relevant to this topic based on the context." if topic != "all" else "Cover all topics in the context."
        
    prompt = f"""[INST] You are an expert educator. Extract exactly {count} distinct facts from the DOCUMENT CONTENT below and turn them into flashcards.
{topic_instruction}
CRITICAL INSTRUCTIONS:
- You must ONLY use the provided DOCUMENT CONTENT.
- DO NOT use prior knowledge, and DO NOT ask questions about this prompt or your role.
- If there is not enough information for {count} flashcards, generate as many as you can from the text.

Format each flashcard exactly as:
Q: <question>
A: <answer>

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    yield from llm.create_completion(prompt, max_tokens=1200, stop=["</s>", "[INST]"], stream=True)


def generate_quiz(llm, count: int = 5, fmt: str = "text", topic: str = "all"):
    context = _get_context(topic if topic != "all" else "")
        
    if not context.strip():
        # Early exit if there is strictly no document output
        yield {"choices": [{"text": "[]" if fmt == "json" else "No documents found in the database. Please use /add or /load first."}]}
        return

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

    prompt = f"""[INST] You are an expert quiz generator. Based on the DOCUMENT CONTENT below, create exactly {count} multiple-choice questions. 
{topic_instruction}
CRITICAL INSTRUCTIONS:
- You must ONLY use the provided DOCUMENT CONTENT.
- DO NOT use prior knowledge, and DO NOT ask questions about this prompt or your role.
- Every single question AND answer must be directly supported by the text.

{format_instruction}

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    yield from llm.create_completion(prompt, max_tokens=2000, stop=["</s>", "[INST]"], stream=True)


def generate_topics(llm):
    """Summarizes the uploaded documents into a list of key topics."""
    context = _get_context()
        
    if not context.strip():
        yield {"choices": [{"text": "[]"}]}
        return
        
    prompt = f"""[INST] You are an expert analyst. Read the DOCUMENT CONTENT below and extract the 5 to 10 most important key topics or themes. 
CRITICAL INSTRUCTIONS:
- You must ONLY return a valid JSON array of strings.
- DO NOT add any conversational text or markdown formatting outside the JSON array.
- DO NOT use prior knowledge.

Example format:
["Topic 1", "Topic 2", "Topic 3"]

<DOCUMENT_CONTENT>
{context}
</DOCUMENT_CONTENT>
[/INST]"""
    yield from llm.create_completion(prompt, max_tokens=500, stop=["</s>", "[INST]"], stream=True)


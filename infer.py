import os
import sys

os.makedirs("models", exist_ok=True)
os.makedirs("data", exist_ok=True)

try:
    from rag_core import load_llm, add_docs, chunk_text, generate_answer, generate_flashcards, generate_quiz, clear_db
    from doc_parser import parse_document
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please ensure you installed the required packages.")
    sys.exit(1)


def cmd_add(text: str):
    if not text:
        print("⚠️  Usage: /add <text>")
        return
    print("✂️  Chunking and embedding text...")
    chunks = chunk_text(text)
    add_docs(chunks)
    print(f"✅ Embedded {len(chunks)} chunk(s) into Vector DB.")


def cmd_load(filepath: str):
    if not filepath:
        print("⚠️  Usage: /load <filepath>")
        return
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        return
    parsed_text = parse_document(filepath)
    if not parsed_text:
        print(f"⚠️  Could not extract text from: {filepath}")
        return
    print("✂️  Chunking and embedding document...")
    chunks = chunk_text(parsed_text)
    add_docs(chunks, source=os.path.basename(filepath))
    print(f"✅ Embedded {len(chunks)} chunk(s) from '{os.path.basename(filepath)}'.")


def cmd_flashcard(llm, count: int = 5, topic: str = "all"):
    print(f"\n🃏 Generating {count} flashcard(s) on '{topic}'...\n")
    print("--- Flashcards ---")
    stream = generate_flashcards(llm, count, topic)
    for chunk in stream:
        print(chunk["choices"][0].get("text", ""), end="", flush=True)
    print("\n------------------\n")


def cmd_quiz(llm, question_count: int = 5, fmt: str = "text", topic: str = "all"):
    print(f"\n📝 Generating {question_count} question quiz on '{topic}' in {fmt.upper()} format...\n")
    print("--- Quiz ---")
    stream = generate_quiz(llm, question_count, fmt, topic)
    for chunk in stream:
        print(chunk["choices"][0].get("text", ""), end="", flush=True)
    print("\n------------\n")


def parse_command(raw: str):
    parts = raw.strip().split()
    return parts[0].lower(), parts[1:]


def main():
    print("\n" + "="*50)
    print("🚀 LetsLearn Local RAG")
    print("="*50 + "\n")

    model_path = "models/mistral.gguf"

    if not os.path.exists(model_path):
        print(f"❌ Model not found at '{model_path}'.")
        print("\n📥 Download: TheBloke/Mistral-7B-Instruct-v0.2-GGUF")
        print("   Rename to 'mistral.gguf' and place in the 'models/' folder.")
        sys.exit(1)

    print("🧠 Loading LLM...")
    llm = load_llm(model_path)
    if not llm:
        print("❌ Failed to load LLM.")
        sys.exit(1)

    print("🧹 Auto-clearing vector DB on startup...")
    clear_db()

    print("\n✅ Ready!\n")
    print("=========================================")
    print("  Commands:")
    print("  /add <text>                            — embed raw text")
    print("  /load <filepath>                       — parse & embed a document")
    print("  /clear                                 — clear the vector database")
    print("  /flashcard <count> <topic|all>         — generate flashcards")
    print("  /quiz <count> <json|text> <topic|all>  — generate a quiz")
    print("  exit / quit                            — exit")
    print("=========================================\n")

    while True:
        try:
            user_input = input("👤 > ").strip()

            if not user_input:
                continue

            if user_input.lower() in ["exit", "quit"]:
                print("\nGoodbye! 👋")
                break

            cmd, args = parse_command(user_input)

            if cmd == "/add":
                cmd_add(" ".join(args))

            elif cmd == "/load":
                cmd_load(" ".join(args))

            elif cmd == "/clear":
                clear_db()

            elif cmd == "/flashcard":
                count = int(args[0]) if args and args[0].isdigit() else 5
                topic = " ".join(args[1:]) if len(args) > 1 else "all"
                cmd_flashcard(llm, count, topic)

            elif cmd == "/quiz":
                count = int(args[0]) if len(args) > 0 and args[0].isdigit() else 5
                fmt = args[1].lower() if len(args) > 1 and args[1].lower() in ("json", "text") else "text"
                topic = " ".join(args[2:]) if len(args) > 2 else "all"
                cmd_quiz(llm, count, fmt, topic)

            else:
                # Default: answer the question
                print("\n🤖 Thinking...\n")
                print("--- Answer ---")
                stream = generate_answer(llm, user_input)
                for chunk in stream:
                    print(chunk["choices"][0].get("text", ""), end="", flush=True)
                print("\n--------------\n")

        except KeyboardInterrupt:
            print("\nGoodbye! 👋")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    main()

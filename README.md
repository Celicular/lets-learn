# LetsLearn

LetsLearn is an AI-powered educational application utilizing Retrieval-Augmented Generation (RAG) to help users interact with and learn from their documents. The system allows users to upload documents and automatically generates answers, flashcards, multiple-choice quizzes, and key topic summaries based strictly on the provided context.

### Models Used

- **Large Language Model (LLM):** Mistral (`models/mistral.gguf`) run locally via `llama-cpp-python` for text generation. 
- **Embedder Engine:** `BAAI/bge-small-en-v1.5` loaded via `SentenceTransformers` to convert document chunks into semantic vector embeddings.
- **Vector Database:** `ChromaDB` for storing and retrieving the document embeddings efficiently.

### Credits

Strictly built by himadri shekhar Goswami for CODE300.

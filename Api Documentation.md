# LetsLearn API Documentation

**Base URL**: `http://localhost:8000`

All generation endpoints (`/chat`, `/quiz`, `/flashcards`, `/topics`) return **streaming responses**. You should consume them incrementally using `fetch` with `ReadableStream` or equivalent.

---

## Project Management

### `GET /projects`
Returns a list of all projects with their files and cache data.

**Response**
```json
{
  "projects": {
    "Biology": {
      "loaded_files": ["data/Biology/notes.pdf"],
      "cache": {
        "topics": "[\"Photosynthesis\", \"Cellular Respiration\"]",
        "quizzes": { "photosynthesis": "[{...}]" },
        "flashcards": { "photosynthesis": "Q: ...\nA: ..." }
      }
    }
  }
}
```

---

### `POST /projects`
Creates a new project and its folder.

**Request Body**
```json
{ "name": "Biology" }
```

**Response**
```json
{ "message": "Project 'Biology' created successfully.", "project": "Biology" }
```

---

### `POST /projects/{project_name}/upload`
Uploads a file to the project folder and immediately embeds it into the vector DB.

- **Content-Type**: `multipart/form-data`
- **Body**: `file` — the file binary (`.pdf`, `.pptx`, `.txt`, `.md`, `.csv`, `.json`)

**Response**
```json
{ "message": "File 'notes.pdf' uploaded and actively embedded.", "path": "data/Biology/notes.pdf" }
```

---

### `POST /projects/{project_name}/load`
Clears the vector DB and reloads all files for this project into AI memory.

> [!IMPORTANT]
> You must call this endpoint before asking questions, generating quizzes, or flashcards for a project. It resets the AI context to this project's documents.

**Response**
```json
{
  "message": "Project 'Biology' successfully loaded into active AI memory.",
  "total_files": 2,
  "embedded_files": 2
}
```

---

## AI Generation Endpoints

> [!NOTE]
> All generation endpoints stream their response. Collect chunks until the stream ends to get the full output. Quizzes, flashcards, and topics are cached in `projects.json` after the first generation (except when `topic` is `"all"`).

### `POST /chat`
Streams an AI answer to a question from the loaded project documents.

**Request Body**
```json
{ "query": "What is photosynthesis?" }
```

**Response**: `text/plain` stream
```
Photosynthesis is the process by which plants convert sunlight...
```

---

### `GET /projects/{project_name}/topics`
Extracts the 5–10 most important topics from the actively loaded documents.

**Caching**: Result is cached per project. Returns instantly on subsequent calls.

**Response**: `application/json` stream (JSON array of strings)
```json
["Photosynthesis", "Cellular Respiration", "Chloroplasts", "ATP Synthesis", "Mitochondria"]
```

---

### `POST /projects/{project_name}/quiz`
Generates a multiple-choice quiz from the project's documents.

**Request Body**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `count` | `int` | `5` | Number of questions |
| `fmt` | `string` | `"json"` | `"json"` or `"text"` |
| `topic` | `string` | `"all"` | Topic to focus on, or `"all"` |

**Caching**: Result is cached by `topic` key (not cached when `topic` is `"all"`).

**Response (fmt=json)**: `application/json` stream
```json
[
  {
    "question": "What molecule carries energy in cells?",
    "options": ["ATP", "ADP", "Glucose", "DNA"],
    "answer": "ATP"
  }
]
```

**Response (fmt=text)**: `text/plain` stream
```
Q1: What molecule carries energy in cells?
- ATP
- ADP
- Glucose
- DNA
```

> [!IMPORTANT]
> In both formats, the **first option is always the correct answer**. Shuffle the `options` array on the frontend before displaying to the user.

---

### `POST /projects/{project_name}/flashcards`
Generates Q&A flashcards from the project's documents.

**Request Body**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `count` | `int` | `5` | Number of flashcards |
| `topic` | `string` | `"all"` | Topic to focus on, or `"all"` |

**Caching**: Result is cached by `topic` key (not cached when `topic` is `"all"`).

**Response**: `text/plain` stream
```
Q: What is the powerhouse of the cell?
A: The mitochondria.

Q: What pigment is responsible for photosynthesis?
A: Chlorophyll.
```

---

## Cache Behaviour Summary

| Endpoint | Cached? | Cache Key |
|----------|---------|-----------|
| `GET /projects/{name}/topics` | ✅ Always | Per project |
| `POST /projects/{name}/quiz` | ✅ If topic ≠ "all" | `{topic}` string |
| `POST /projects/{name}/flashcards` | ✅ If topic ≠ "all" | `{topic}` string |
| `POST /chat` | ❌ Never | — |

Cache is stored inside `projects.json` under each project's `cache` key. To clear cache, either delete the project and recreate it, or manually null out the corresponding key in `projects.json`.

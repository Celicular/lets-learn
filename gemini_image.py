import os
import base64
import datetime
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation"


def generate_image_base64(prompt: str) -> str | None:
    """Generate an image from a prompt and return it as a base64 string."""
    try:
        model = genai.GenerativeModel(IMAGE_MODEL)
        response = model.generate_content(
            prompt,
            generation_config={"response_modalities": ["IMAGE", "TEXT"]}
        )
        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                return base64.b64encode(part.inline_data.data).decode("utf-8")
    except Exception as e:
        print(f"⚠️ [GEMINI] Image generation failed: {e}")
    return None


def save_image_to_disk(base64_data: str, project_name: str, query: str) -> str:
    """Save a base64 image to disk and return the relative file path."""
    images_dir = os.path.join("data", project_name, "images")
    os.makedirs(images_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_query = "".join(c if c.isalnum() else "_" for c in query[:30]).strip("_")
    filename = f"{timestamp}_{safe_query}.png"
    filepath = os.path.join(images_dir, filename)

    image_bytes = base64.b64decode(base64_data)
    with open(filepath, "wb") as f:
        f.write(image_bytes)

    print(f"✅ [GEMINI] Image saved: {filepath}")
    return filepath

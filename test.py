import requests
import urllib.parse

API_KEY = "sk_304eQqCnvAXDEWZOsXnK9zUjK7vuRGoX"  # optional if your endpoint requires it

text = "Hello Decision Tree, how are you?"
prompt = f"Translate this to Hindi: {text}"

url = f"https://gen.pollinations.ai/text/{urllib.parse.quote(prompt)}?model=openai-fast"

headers = {
    "Authorization": f"Bearer {API_KEY}"
}

response = requests.get(url, headers=headers)

print(response.text)
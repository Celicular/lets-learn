import os
from huggingface_hub import hf_hub_download

def download_mistral_model():
    """
    Downloads the Mistral 7B Instruct v0.2 Quantized GGUF model 
    from TheBloke on HuggingFace into the local 'models' folder.
    """
    repo_id = "TheBloke/Mistral-7B-Instruct-v0.2-GGUF"
    filename = "mistral-7b-instruct-v0.2.Q4_K_M.gguf"
    
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(models_dir, exist_ok=True)
    
    target_path = os.path.join(models_dir, "mistral.gguf")
    
    if os.path.exists(target_path):
        print(f"✅ Model already exists at {target_path}")
        return target_path
        
    print(f"📥 Downloading {filename} from {repo_id}...")
    print("This might take a while depending on your internet connection (approx 4.37 GB).")
    
    try:
        downloaded_file = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir=models_dir,
            local_dir_use_symlinks=False
        )
        
        # Rename the downloaded file to 'mistral.gguf' as expected by our system
        if downloaded_file != target_path:
            os.rename(downloaded_file, target_path)
            
        print(f"\n🎉 Download complete! Model saved to: {target_path}")
        return target_path
    
    except Exception as e:
        print(f"\n❌ Error downloading model: {e}")
        return None

if __name__ == "__main__":
    print("🚀 LetsLearn - Model Setup")
    download_mistral_model()

#!/usr/bin/env python3
import subprocess
import sys

def setup_vllm():
    print("🚀 Configurando vLLM para LLaMA 70B...")

    # Instalar vLLM
    subprocess.run([sys.executable, "-m", "pip", "install", "vllm"], check=True)

    # Baixar modelo
    print("⬇️ Preparando LLaMA 70B...")
    # Assume que o modelo está disponível localmente ou via HuggingFace

    # Iniciar servidor
    print("🌐 Iniciando servidor vLLM...")
    subprocess.Popen([
        sys.executable, "-m", "vllm.entrypoints.openai.api_server",
        "--model", "meta-llama/Llama-3.1-70B-Instruct",
        "--tensor-parallel-size", "4",  # Ajustar baseado na GPU
        "--max-model-len", "4096"
    ])

    print("✅ vLLM configurado! API OpenAI-compatible em http://localhost:8000")

if __name__ == "__main__":
    setup_vllm()
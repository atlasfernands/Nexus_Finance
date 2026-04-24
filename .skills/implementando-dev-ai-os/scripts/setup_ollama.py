#!/usr/bin/env python3
import subprocess
import sys
import os

def setup_ollama():
    print("🚀 Configurando Ollama para LLaMA 70B...")

    # Verificar se Ollama está instalado
    try:
        result = subprocess.run(["ollama", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Ollama já instalado")
        else:
            raise FileNotFoundError
    except FileNotFoundError:
        print("📦 Instalando Ollama...")
        # Para Windows, baixar e instalar
        subprocess.run(["winget", "install", "Ollama.Ollama"], check=True)

    # Baixar LLaMA 70B
    print("⬇️ Baixando LLaMA 70B...")
    subprocess.run(["ollama", "pull", "llama3.1:70b"], check=True)

    # Criar API local
    print("🌐 Iniciando servidor Ollama...")
    subprocess.Popen(["ollama", "serve"])

    print("✅ Ollama configurado! API disponível em http://localhost:11434")

if __name__ == "__main__":
    setup_ollama()
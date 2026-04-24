#!/usr/bin/env python3
import subprocess
import sys

def setup_rag():
    print("🧠 Configurando sistema RAG...")

    # Instalar dependências
    subprocess.run([sys.executable, "-m", "pip", "install", "chromadb", "sentence-transformers", "langchain"], check=True)

    # Código básico de RAG
    rag_code = '''
from langchain.vectorstores import Chroma
from langchain.embeddings import SentenceTransformerEmbeddings
from langchain.text_splitter import CharacterTextSplitter
import os

def index_project(project_path):
    embeddings = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma(embedding_function=embeddings, persist_directory="./chroma_db")

    documents = []
    for root, dirs, files in os.walk(project_path):
        for file in files:
            if file.endswith(('.py', '.js', '.ts', '.md')):
                with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                    content = f.read()
                    documents.append(content)

    text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
    texts = text_splitter.create_documents(documents)

    vectorstore.add_documents(texts)
    vectorstore.persist()

    return vectorstore

def query_rag(question, vectorstore):
    docs = vectorstore.similarity_search(question, k=3)
    context = "\\n".join([doc.page_content for doc in docs])
    return context
'''

    with open("rag_system.py", "w") as f:
        f.write(rag_code)

    print("✅ Sistema RAG configurado!")
    print("📚 Use rag_system.py para indexar projetos e consultar")

if __name__ == "__main__":
    setup_rag()
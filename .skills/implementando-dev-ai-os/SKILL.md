---
name: implementando-dev-ai-os
description: Esta skill auxilia na implementação de um sistema Local Dev AI OS integrado ao VS Code, com LLM LLaMA 70B, RAG, dashboard e automações quando necessário para construir um engenheiro de software automático local.
---

# Implementando Dev AI OS

Esta skill guia a implementação completa de um sistema de IA local integrado ao VS Code, incluindo LLM LLaMA 70B, RAG para memória de projeto, ferramentas de automação e dashboard de controle.

## Funcionalidades

- **Configuração LLM**: Scripts para rodar LLaMA 70B via Ollama/vLLM
- **Extensão VS Code**: Templates e scripts para criar extensão própria
- **RAG Integration**: Sistema de embeddings e indexação de projetos
- **Tools Layer**: Scripts para execução de terminal e builders
- **Dashboard Electron**: Template para control center da IA
- **Fases Estruturadas**: Implementação passo-a-passo

## Como usar

Execute as fases em ordem:

1. **Fase 1**: Configurar LLM (Ollama/vLLM)
2. **Fase 2**: Criar extensão VS Code básica
3. **Fase 3**: Integrar RAG
4. **Fase 4**: Adicionar tools
5. **Fase 5**: Criar dashboard

## Scripts disponíveis

- `setup_ollama.py`: Instala e configura Ollama
- `setup_vllm.py`: Instala e configura vLLM
- `create_vscode_extension.py`: Gera template de extensão
- `setup_rag.py`: Configura sistema RAG com embeddings
- `create_dashboard.py`: Gera template Electron dashboard
- `integrate_tools.py`: Adiciona layer de tools

## Integração com VS Code

- Tasks automáticas para cada fase
- Extensão gerada integrada
- Dashboard como app separado
- Memória persistente por projeto

## Princípios

- Implementação incremental por fases
- Uso de tecnologias comprovadas (Ollama, vLLM, Electron)
- Foco em produtividade e automação
- Arquitetura modular e extensível
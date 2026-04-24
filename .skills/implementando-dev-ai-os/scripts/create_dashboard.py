#!/usr/bin/env python3
import json
import os

def create_dashboard():
    print("📊 Criando dashboard Electron...")

    dashboard_dir = "dev-ai-dashboard"
    os.makedirs(dashboard_dir, exist_ok=True)

    # package.json
    package = {
        "name": "dev-ai-dashboard",
        "version": "0.0.1",
        "main": "main.js",
        "scripts": {"start": "electron ."},
        "dependencies": {"electron": "^25.0.0"}
    }

    with open(f"{dashboard_dir}/package.json", "w") as f:
        json.dump(package, f, indent=2)

    # main.js
    main_js = '''
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
'''

    with open(f"{dashboard_dir}/main.js", "w") as f:
        f.write(main_js)

    # index.html
    html = '''
<!DOCTYPE html>
<html>
<head>
    <title>Dev AI OS Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 20px; border: 1px solid #ccc; }
        button { padding: 10px 20px; margin: 5px; }
    </style>
</head>
<body>
    <h1>🧠 Dev AI OS Dashboard</h1>

    <div class="section">
        <h2>🤖 Controle do Modelo</h2>
        <select id="model-select">
            <option>llama3.1:70b</option>
            <option>llama3.1:8b</option>
        </select>
        <label>Temperatura: <input type="range" id="temperature" min="0" max="2" step="0.1" value="0.7"></label>
    </div>

    <div class="section">
        <h2>📁 Projetos</h2>
        <button onclick="indexProject()">Indexar Projeto Atual</button>
        <div id="projects-list"></div>
    </div>

    <div class="section">
        <h2>⚙️ Automação</h2>
        <button onclick="generateApp()">Gerar App</button>
        <button onclick="createSkill()">Criar Skill</button>
        <button onclick="refactorCode()">Refatorar Código</button>
    </div>

    <div class="section">
        <h2>💬 Chat</h2>
        <div id="chat-history"></div>
        <input type="text" id="chat-input" placeholder="Pergunte para a IA...">
        <button onclick="sendMessage()">Enviar</button>
    </div>

    <script>
        async function sendMessage() {
            const input = document.getElementById('chat-input');
            const message = input.value;
            if (!message) return;

            // Add to chat
            const chat = document.getElementById('chat-history');
            chat.innerHTML += `<p><strong>You:</strong> ${message}</p>`;

            // Call LLM API
            try {
                const response = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: document.getElementById('model-select').value,
                        prompt: message,
                        temperature: parseFloat(document.getElementById('temperature').value),
                        stream: false
                    })
                });
                const data = await response.json();
                chat.innerHTML += `<p><strong>AI:</strong> ${data.response}</p>`;
            } catch (error) {
                chat.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
            }

            input.value = '';
        }

        function generateApp() {
            // Implement app generation logic
            alert('Funcionalidade de geração de app - implementar integração');
        }

        function createSkill() {
            // Implement skill creation logic
            alert('Funcionalidade de criação de skill - implementar integração');
        }

        function refactorCode() {
            // Implement code refactoring logic
            alert('Funcionalidade de refatoração - implementar integração');
        }

        function indexProject() {
            // Implement project indexing logic
            alert('Funcionalidade de indexação - implementar integração');
        }
    </script>
</body>
</html>
'''

    with open(f"{dashboard_dir}/index.html", "w") as f:
        f.write(html)

    print("✅ Dashboard Electron criado em dev-ai-dashboard/")
    print("📦 Execute: cd dev-ai-dashboard && npm install && npm start")

if __name__ == "__main__":
    create_dashboard()
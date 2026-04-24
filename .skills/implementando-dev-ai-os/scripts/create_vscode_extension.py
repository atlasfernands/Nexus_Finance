#!/usr/bin/env python3
import os
import json
from pathlib import Path

def create_vscode_extension():
    print("🔧 Criando extensão VS Code...")

    ext_dir = Path("dev-ai-extension")
    ext_dir.mkdir(exist_ok=True)

    # package.json
    package = {
        "name": "dev-ai-os",
        "displayName": "Dev AI OS",
        "description": "Local AI development assistant",
        "version": "0.0.1",
        "engines": {"vscode": "^1.74.0"},
        "categories": ["Other"],
        "activationEvents": ["onCommand:devai.chat"],
        "main": "./out/extension.js",
        "contributes": {
            "commands": [
                {"command": "devai.chat", "title": "Open Dev AI Chat"},
                {"command": "devai.generateProject", "title": "Generate Project"},
                {"command": "devai.createSkill", "title": "Create Skill"}
            ],
            "views": {
                "explorer": [
                    {"id": "devai-projects", "name": "AI Projects"}
                ]
            }
        },
        "scripts": {"vscode:prepublish": "npm run compile", "compile": "tsc -p ./"},
        "dependencies": {"axios": "^1.4.0"},
        "devDependencies": {"@types/vscode": "^1.74.0", "@types/node": "16.x", "typescript": "^4.9.0"}
    }

    with open(ext_dir / "package.json", "w") as f:
        json.dump(package, f, indent=2)

    # tsconfig.json
    tsconfig = {
        "compilerOptions": {
            "module": "commonjs",
            "target": "ES2020",
            "outDir": "out",
            "lib": ["ES2020"],
            "sourceMap": True,
            "rootDir": "src",
            "strict": True
        }
    }

    with open(ext_dir / "tsconfig.json", "w") as f:
        json.dump(tsconfig, f, indent=2)

    # src/extension.ts
    extension_code = '''
import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    const chatCommand = vscode.commands.registerCommand('devai.chat', async () => {
        const prompt = await vscode.window.showInputBox({ prompt: 'Ask Dev AI:' });
        if (prompt) {
            try {
                const response = await axios.post('http://localhost:11434/api/generate', {
                    model: 'llama3.1:70b',
                    prompt: prompt,
                    stream: false
                });
                vscode.window.showInformationMessage(response.data.response);
            } catch (error) {
                vscode.window.showErrorMessage('Error connecting to LLM');
            }
        }
    });

    context.subscriptions.push(chatCommand);
}

export function deactivate() {}
'''

    (ext_dir / "src").mkdir(exist_ok=True)
    with open(ext_dir / "src" / "extension.ts", "w") as f:
        f.write(extension_code)

    print("✅ Extensão VS Code criada em dev-ai-extension/")
    print("📦 Execute: cd dev-ai-extension && npm install && npm run compile")

if __name__ == "__main__":
    create_vscode_extension()
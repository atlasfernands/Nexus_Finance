#!/usr/bin/env python3
import json

def integrate_tools():
    print("🔨 Integrando layer de tools...")

    tools_code = '''
import subprocess
import json
from pathlib import Path

def execute_terminal(command):
    """Execute terminal command and return output"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout + result.stderr
    except Exception as e:
        return str(e)

def create_file(file_path, content):
    """Create or update file"""
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    return f"File {file_path} created successfully"

def read_file(file_path):
    """Read file content"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return str(e)

def list_directory(path):
    """List directory contents"""
    try:
        items = []
        for item in Path(path).iterdir():
            items.append(f"{'[DIR]' if item.is_dir() else '[FILE]'} {item.name}")
        return "\\n".join(items)
    except Exception as e:
        return str(e)

# Tool registry
TOOLS = {
    "execute_terminal": execute_terminal,
    "create_file": create_file,
    "read_file": read_file,
    "list_directory": list_directory
}

def call_tool(tool_name, **kwargs):
    if tool_name in TOOLS:
        return TOOLS[tool_name](**kwargs)
    return f"Tool {tool_name} not found"
'''

    with open("tools_layer.py", "w") as f:
        f.write(tools_code)

    print("✅ Layer de tools integrado!")
    print("🛠️ Use tools_layer.py para executar comandos e manipular arquivos")

if __name__ == "__main__":
    integrate_tools()
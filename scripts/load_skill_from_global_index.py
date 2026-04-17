#!/usr/bin/env python3
"""Load a skill markdown file from the Antigravity global skills junction on demand."""
import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

DEFAULT_INDEX_NAME = "skills_index.json"
DEFAULT_CHECKPOINT_FILE = Path.home() / ".gemini" / "antigravity" / "skill_checkpoints.json"
DEFAULT_ROOTS = [
    Path.home() / ".gemini" / "antigravity" / "skills",
    Path("D:/1250 Skills/antigravity-awesome-skills-main/skills"),
    Path("D:/Vscode/ferramentas/1250 Skills/antigravity-awesome-skills-main/skills"),
]


def find_local_skill_root_from_cwd(max_depth: int = 6) -> Optional[Path]:
    current = Path.cwd()
    for _ in range(max_depth):
        candidate = current / "skills"
        if candidate.exists() and (candidate / DEFAULT_INDEX_NAME).exists():
            return candidate
        current = current.parent
    return None


def candidate_roots(explicit_root: Optional[Path]) -> List[Path]:
    roots: List[Path] = []
    if explicit_root:
        roots.append(explicit_root)
    env_root = os.environ.get("ANTIGRAVITY_SKILLS_ROOT")
    if env_root:
        roots.append(Path(env_root))
    local_root = find_local_skill_root_from_cwd()
    if local_root:
        roots.append(local_root)
    roots.extend(DEFAULT_ROOTS)
    return roots


def resolve_root(root_arg: Optional[str], index_arg: Optional[str]) -> Tuple[Path, Path]:
    explicit_root = Path(root_arg).expanduser() if root_arg else None
    explicit_index = Path(index_arg).expanduser() if index_arg else None

    if explicit_index and explicit_index.exists():
        root_candidate = explicit_index.parent
        if (root_candidate / DEFAULT_INDEX_NAME).exists():
            return root_candidate, explicit_index
        raise FileNotFoundError(f"Specified index found but not valid: {explicit_index}")

    for root in candidate_roots(explicit_root):
        index_path = root / DEFAULT_INDEX_NAME
        if root.exists() and index_path.exists():
            return root, index_path

    raise FileNotFoundError(
        "No valid Antigravity skills root found. Tried:\n" +
        "\n".join(str(root) for root in candidate_roots(explicit_root))
    )


def load_index(index_path: Path) -> List[Dict]:
    with index_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def find_skill(skill_query: str, index: List[Dict], exact: bool = False) -> Dict:
    query = skill_query.strip().lower()
    exact_matches = [entry for entry in index if query == entry.get("id", "").lower() or query == entry.get("name", "").lower()]
    if exact_matches:
        return exact_matches[0]

    if exact:
        raise ValueError(f"Exact skill not found for query: {skill_query}")

    substring_matches = [entry for entry in index if query in entry.get("id", "").lower() or query in entry.get("name", "").lower()]
    if not substring_matches:
        raise ValueError(f"Skill not found for query: {skill_query}")
    if len(substring_matches) > 1:
        candidates = [f"{entry.get('id')} ({entry.get('name')})" for entry in substring_matches[:10]]
        raise ValueError(
            f"Multiple candidates found for '{skill_query}':\n" + "\n".join(candidates) +
            "\nUse a more specific query or exact id/name."
        )
    return substring_matches[0]


def resolve_markdown(skill_entry: Dict, skills_root: Path) -> Path:
    path = skill_entry.get("path")
    if not path:
        raise ValueError(f"Skill entry missing path: {skill_entry}")

    skill_dir = skills_root / path
    if not skill_dir.exists() or not skill_dir.is_dir():
        raise FileNotFoundError(f"Skill directory not found: {skill_dir}")

    candidates = [
        skill_dir / "README.md",
        skill_dir / "SKILL.md",
        skill_dir / "index.md",
        skill_dir / "skill.md",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate

    md_files = sorted(skill_dir.glob("*.md"))
    if len(md_files) == 1:
        return md_files[0]
    if md_files:
        raise FileNotFoundError(
            f"Multiple markdown files found in {skill_dir}, cannot decide which to use: {', '.join(str(p.name) for p in md_files)}"
        )

    raise FileNotFoundError(f"No markdown file found in skill directory: {skill_dir}")


def ensure_checkpoint_file(checkpoint_file: Path) -> None:
    checkpoint_dir = checkpoint_file.parent
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    if not checkpoint_file.exists():
        checkpoint_file.write_text("[]", encoding="utf-8")


def save_checkpoint(checkpoint_file: Path, entry: Dict) -> None:
    ensure_checkpoint_file(checkpoint_file)
    try:
        with checkpoint_file.open("r", encoding="utf-8") as f:
            history = json.load(f)
    except json.JSONDecodeError:
        history = []
    history.append(entry)
    history = history[-200:]
    with checkpoint_file.open("w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)


def print_skill_info(skill_entry: Dict, md_path: Path, root_path: Path) -> None:
    print(f"Selected skill: {skill_entry.get('id')} - {skill_entry.get('name')}")
    print(f"Category: {skill_entry.get('category')}")
    print(f"Resolved root: {root_path}")
    print(f"Resolved path: {md_path}")
    print(f"Description: {skill_entry.get('description')}")
    print("\n---\n")
    print(md_path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Load a single Antigravity skill markdown file by id or name.")
    parser.add_argument("skill", help="Skill id or name to load")
    parser.add_argument("--index", help="Path to skills_index.json")
    parser.add_argument("--root", help="Root path of the global skills junction")
    parser.add_argument("--exact", action="store_true", help="Match id or name exactly")
    parser.add_argument("--show-path", action="store_true", help="Only print the resolved markdown file path")
    parser.add_argument("--checkpoint", action="store_true", help="Save a checkpoint of this skill usage")
    args = parser.parse_args()

    try:
        root_path, index_path = resolve_root(args.root, args.index)
        index = load_index(index_path)
        skill = find_skill(args.skill, index, exact=args.exact)
        md_path = resolve_markdown(skill, root_path)
        if args.show_path:
            print(md_path)
        else:
            print_skill_info(skill, md_path, root_path)

        if args.checkpoint:
            checkpoint_entry = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "query": args.skill,
                "skill_id": skill.get("id"),
                "skill_name": skill.get("name"),
                "skill_path": skill.get("path"),
                "root": str(root_path),
                "index": str(index_path),
            }
            save_checkpoint(DEFAULT_CHECKPOINT_FILE, checkpoint_entry)
            print(f"\nCheckpoint saved to {DEFAULT_CHECKPOINT_FILE}")
    except Exception as exc:
        raise SystemExit(str(exc))


if __name__ == "__main__":
    main()

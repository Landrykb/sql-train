#!/usr/bin/env bash
set -euo pipefail

OUT="packages/frontend/public/guides"
mkdir -p "\$OUT"

# dump all unique skills via Python
python3 - << 'PYCODE'
import yaml, pathlib
BLUE = yaml.safe_load(pathlib.Path("curriculum_blueprints.yaml").read_text())
skills = set()
for spec in BLUE.values():
    for step in spec["path"]:
        skills.update(step.get("skills", []))
out = pathlib.Path("packages/frontend/public/guides")
for s in sorted(skills):
    fn = out / f"{s}.md"
    if not fn.exists():
        fn.write_text(f"# {s.upper()}\n\n*(Coming soon: definition, syntax, examples…)*\n")
        print("Created stub", fn)
PYCODE

echo "✅ All guide stubs generated."

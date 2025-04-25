#!/usr/bin/env python3
"""Rebuild docs/learning-path.md from blueprint."""
import yaml, pathlib, textwrap
BLUE = yaml.safe_load(pathlib.Path('curriculum_blueprints.yaml').read_text())
DOCS = pathlib.Path('docs'); DOCS.mkdir(exist_ok=True)
with (DOCS / 'learning-path.md').open('w') as f:
    f.write('# BESA Learning Paths\n')
    for dk, spec in BLUE.items():
        f.write(f"\n## {dk.replace('_',' ').title()}\n{spec.get('narrative','')}\n\n")
        for i, step in enumerate(spec['path'], 1):
            f.write(f"{i}. **{step['title']}** — skills: `{', '.join(step['skills'])}`\n")
print('✅ docs/learning-path.md written')

#!/usr/bin/env python3
import yaml, pathlib, textwrap

BLUE = yaml.safe_load(pathlib.Path('curriculum_blueprints.yaml').read_text())
OUT  = pathlib.Path('cases')
OUT.mkdir(exist_ok=True)

def quote_if_needed(s: str) -> str:
    return f'\"{s}\"' if ':' in s else s

TEMPLATE = textwrap.dedent("""
id: {id}
name: {name}
tier: {tier}
domain: {domain}
description: |
  {goal}
skills: {skills}
dataset_key: {dataset}
prereq_cases: {prereqs}
datasets:
  - name: main
    file: {dataset}.csv
seedQuery: |
  -- TODO: write query for {id}
  SELECT 1;
expected: []
hints:
  - "Review the {primary_skill} concept in the GuideBook."
""")

for domain_key, spec in BLUE.items():
    domain = domain_key.split('_')[0]
    ds     = spec['dataset']
    steps  = spec['path']
    ddir   = OUT / domain
    ddir.mkdir(parents=True, exist_ok=True)

    for idx, step in enumerate(steps):
        prereqs = [s['id'] for s in steps[:idx]]
        name    = quote_if_needed(step['title'])
        out_txt = TEMPLATE.format(
            id=step['id'],
            name=name,
            tier=step['tier'],
            domain=domain,
            goal=step['goal'],
            skills=step['skills'],
            primary_skill=step['skills'][0],
            dataset=ds,
            prereqs=prereqs
        ).lstrip()
        (ddir / f"{step['id']}.yaml").write_text(out_txt)
        print("✅ Generated", ddir / f"{step['id']}.yaml")

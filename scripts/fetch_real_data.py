#!/usr/bin/env python3
import yaml, requests, pandas as pd, pathlib, io, urllib

# Load the dataset registry
reg = yaml.safe_load(pathlib.Path('dataset_registry.yaml').read_text())['datasets']

# Ensure output folder exists
out_dir = pathlib.Path('datasets')
out_dir.mkdir(exist_ok=True)

def fetch_one(key, meta):
    stub = out_dir / f"{key}.csv"
    print(f"→ {key}", end='')

    # 1) Stub‑first
    if stub.exists():
        print("  [STUB‑LOAD]", end='')
        df = pd.read_csv(stub)
        source = "STUB"

    else:
        url = meta.get('url')
        if not url:
            print("  ⚠️ skipped (no URL)"); return

        if url.startswith('file://'):
            # Local file loader
            path = pathlib.Path(urllib.parse.urlparse(url).path)
            if not path.exists():
                print("  ⚠️ skipped (file missing)"); return
            print("  [FILE://‑LOAD]", end='')
            df = pd.read_csv(path) if meta['format']=='csv' else pd.read_parquet(path)
            source = "LOCAL"

        else:
            # HTTP fetch w/ progress
            print("  [HTTP]", end='', flush=True)
            try:
                r = requests.get(url, stream=True, timeout=30)
                r.raise_for_status()
                if meta['format']=='csv':
                    total = int(r.headers.get('content-length', 0)) or None
                    chunks, downloaded = [], 0
                    for chunk in r.iter_content(chunk_size=8192):
                        if not chunk: continue
                        chunks.append(chunk); downloaded += len(chunk)
                        if total:
                            pct = downloaded*100//total
                            print(f"\r   [HTTP {pct:3d}%]", end='', flush=True)
                        else:
                            print('.', end='', flush=True)
                    print("\r   [HTTP 100%]", end='', flush=True)
                    text = b''.join(chunks).decode('utf-8', errors='replace')
                    df = pd.read_csv(io.StringIO(text))
                else:
                    df = pd.read_parquet(io.BytesIO(r.content))
                source = "HTTP"
            except Exception as e:
                print(f"  ⚠️ HTTPError ({e.__class__.__name__})"); return

    # 2) Apply transforms
    for t in meta.get('transforms', []):
        if 'rename' in t:
            df = df.rename(columns=t['rename'])
        if 'select' in t:
            df = df[t['select']]
        if 'filter' in t:
            cond = t['filter']
            if isinstance(cond, str):
                df = df.query(cond)
            elif isinstance(cond, dict):
                for col, val in cond.items():
                    df = df[df[col] == val]
            else:
                print(f"  ⚠️ skipped bad filter type: {type(cond)}")

    # 3) Save & report
    df.to_csv(stub, index=False)
    print(f"  ({source}) saved {stub}")

if __name__ == '__main__':
    for key, meta in reg.items():
        fetch_one(key, meta)

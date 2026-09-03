#!/usr/bin/env python3
"""
Validate hidden case solutionQueries against actual CSV data and regenerate expected output.
Usage: python3 gen_expected.py
"""
import sqlite3
import csv
import os
import yaml
import json
import glob

DATASETS_DIR = "public/datasets"
CASES_DIR = "cases"

def load_csv_to_sqlite(conn, table_name, csv_path):
    """Load a CSV file into a SQLite table."""
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        if not fields:
            print(f"  [WARN] No fields in {csv_path}")
            return
        
        # Infer types from first row
        rows = list(reader)
        if not rows:
            print(f"  [WARN] No data in {csv_path}")
            return
        
        col_defs = []
        for field in fields:
            sample = rows[0].get(field, '')
            try:
                float(sample)
                col_defs.append(f'"{field}" REAL')
            except (ValueError, TypeError):
                col_defs.append(f'"{field}" TEXT')
        
        conn.execute(f'DROP TABLE IF EXISTS "{table_name}"')
        conn.execute(f'CREATE TABLE "{table_name}" ({", ".join(col_defs)})')
        
        placeholders = ", ".join(["?"] * len(fields))
        col_names = ", ".join(f'"{f}"' for f in fields)
        insert_sql = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'
        
        for row in rows:
            values = []
            for field in fields:
                val = row.get(field, '')
                if val == '' or val is None:
                    values.append(None)
                else:
                    try:
                        values.append(float(val))
                    except (ValueError, TypeError):
                        values.append(val.strip())
            conn.execute(insert_sql, values)
        
        conn.commit()
        print(f"  [OK] Loaded {table_name}: {len(rows)} rows, columns: {fields}")

def run_solution_query(conn, solution_query):
    """Run a solution query and return results as list of dicts."""
    try:
        cursor = conn.execute(solution_query)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        results = []
        for row in rows:
            result = {}
            for col, val in zip(columns, row):
                if isinstance(val, float):
                    # Round to reasonable precision
                    result[col] = round(val, 2) if val != int(val) else int(val)
                else:
                    result[col] = val
            results.append(result)
        return columns, results, None
    except Exception as e:
        return None, None, str(e)

def main():
    # Find all hidden case YAMLs
    hidden_files = sorted(glob.glob(os.path.join(CASES_DIR, "*", "hidden_*.yaml")))
    trial_files = sorted(glob.glob(os.path.join(CASES_DIR, "*", "trial_*.yaml")))
    hidden_files = hidden_files + trial_files
    print(f"Found {len(hidden_files)} cases ({len(hidden_files) - len(trial_files)} hidden + {len(trial_files)} trial)\n")
    
    results = {}
    
    for yaml_path in hidden_files:
        case_name = os.path.basename(yaml_path).replace('.yaml', '')
        domain = os.path.basename(os.path.dirname(yaml_path))
        print(f"\n{'='*60}")
        print(f"Case: {case_name} (domain: {domain})")
        print(f"{'='*60}")
        
        with open(yaml_path, 'r') as f:
            doc = yaml.safe_load(f)
        
        if not doc:
            print("  [WARN] Empty YAML")
            continue
        
        datasets = doc.get('datasets', [])
        solution_query = doc.get('solutionQuery', '')
        current_expected = doc.get('expected', [])
        
        if not solution_query:
            print("  [WARN] No solutionQuery")
            continue
        
        # Create fresh DB for each case
        conn = sqlite3.connect(':memory:')
        
        # Load datasets
        all_loaded = True
        for ds in datasets:
            csv_path = os.path.join(DATASETS_DIR, ds['file'])
            if not os.path.exists(csv_path):
                print(f"  [FAIL] CSV not found: {csv_path}")
                all_loaded = False
                continue
            load_csv_to_sqlite(conn, ds['name'], csv_path)
        
        if not all_loaded:
            conn.close()
            continue
        
        # Run solution query
        columns, rows, error = run_solution_query(conn, solution_query)
        
        if error:
            print(f"  [FAIL] QUERY FAILED: {error}")
            results[case_name] = {'status': 'FAILED', 'error': error}
        else:
            print(f"  [OK] Query OK: {len(rows)} rows, columns: {columns}")
            if current_expected:
                print(f"  Current expected: {len(current_expected)} rows")
            else:
                print(f"  No expected data currently")
            
            # Show first 3 rows
            for i, row in enumerate(rows[:3]):
                print(f"    Row {i}: {row}")
            if len(rows) > 3:
                print(f"    ... ({len(rows)} total rows)")
            
            results[case_name] = {
                'status': 'OK',
                'columns': columns,
                'rows': rows,
                'row_count': len(rows),
                'yaml_path': yaml_path,
            }
        
        conn.close()
    
    # Summary
    print(f"\n\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    ok = [k for k, v in results.items() if v['status'] == 'OK']
    failed = [k for k, v in results.items() if v['status'] == 'FAILED']
    print(f"[OK] OK: {len(ok)} cases")
    for k in ok:
        print(f"  {k}: {results[k]['row_count']} rows")
    print(f"[FAIL] FAILED: {len(failed)} cases")
    for k in failed:
        print(f"  {k}: {results[k]['error'][:80]}")
    
    # Write expected data for OK cases — surgically replace only the expected: section
    print(f"\n\nWriting expected data for {len(ok)} passing cases...")
    for case_name in ok:
        info = results[case_name]
        yaml_path = info['yaml_path']
        expected_rows = info['rows']
        
        with open(yaml_path, 'r') as f:
            lines = f.readlines()
        
        # Find the expected: line and the next top-level key after it
        exp_start = None
        exp_end = None
        for i, line in enumerate(lines):
            if line.startswith('expected:'):
                exp_start = i
            elif exp_start is not None and exp_end is None:
                # Next top-level key (not indented, not a comment, not blank continuation of expected)
                stripped = line.rstrip()
                if stripped and not stripped.startswith(' ') and not stripped.startswith('-') and not stripped.startswith('#'):
                    exp_end = i
                    break
        
        if exp_start is None:
            print(f"  [WARN] {case_name}: no expected: line found, skipping")
            continue
        
        if exp_end is None:
            exp_end = len(lines)
        
        # Build new expected section using compact inline format
        new_expected_lines = []
        if not expected_rows:
            new_expected_lines.append('expected: []\n')
        else:
            new_expected_lines.append('expected:\n')
            for row in expected_rows:
                parts = []
                for k, v in row.items():
                    if isinstance(v, str):
                        # Escape quotes in string values
                        escaped = v.replace("'", "''")
                        parts.append(f"{k}: '{escaped}'")
                    elif v is None:
                        parts.append(f"{k}: null")
                    else:
                        parts.append(f"{k}: {v}")
                new_expected_lines.append('  - { ' + ', '.join(parts) + ' }\n')
        
        # Reconstruct file
        new_lines = lines[:exp_start] + new_expected_lines + lines[exp_end:]
        
        with open(yaml_path, 'w') as f:
            f.writelines(new_lines)
        
        print(f"  [OK] {case_name}: wrote {len(expected_rows)} expected rows")
    
    print("\nDone!")

if __name__ == '__main__':
    main()

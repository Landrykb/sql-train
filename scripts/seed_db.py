#!/usr/bin/env python3
"""Load all CSVs in datasets/ into Postgres (schema=domain)."""
import argparse, pathlib, pandas as pd, asyncpg, asyncio
ROOT = pathlib.Path('datasets')
CREATE = "CREATE TABLE IF NOT EXISTS {schema}.{table} ({cols});"

async def load(conn, csv: pathlib.Path):
    domain = csv.parent.name; table = csv.stem
    df = pd.read_csv(csv)
    cols = ', '.join(f'{c} TEXT' for c in df.columns)
    await conn.execute(f'CREATE SCHEMA IF NOT EXISTS {domain};')
    await conn.execute(CREATE.format(schema=domain, table=table, cols=cols))
    await conn.copy_records_to_table(table, records=df.itertuples(index=False, name=None), schema_name=domain)

async def main(url):
    conn = await asyncpg.connect(url)
    for csv in ROOT.rglob('*.csv'):
        print('seeding', csv)
        await load(conn, csv)
    await conn.close(); print('✅ Postgres seeded')

if __name__=='__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--pg_url', required=True)
    asyncio.run(main(ap.parse_args().pg_url))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg, duckdb, os, yaml, pathlib, json

API_MODE = os.getenv("API_MODE", "server")
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="BESA SQL API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class QueryReq(BaseModel):
    sql: str
    case_id: str | None = None

@app.get("/health")
async def health():
    return {"status": "ok", "mode": API_MODE}

@app.get("/cases")
async def cases():
    out = []
    for y in pathlib.Path("cases").rglob("*.yaml"):
        out.append(yaml.safe_load(y.read_text()))
    return out

@app.post("/query")
async def query(q: QueryReq):
    if API_MODE == "server" and DATABASE_URL:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            rows = await conn.fetch(q.sql)
            return [dict(r) for r in rows]
        finally:
            await conn.close()
    con = duckdb.connect()
    try:
        return json.loads(con.execute(q.sql).fetchdf().to_json(orient="records"))
    finally:
        con.close()from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg, duckdb, os, yaml, pathlib, json

API_MODE = os.getenv("API_MODE", "server")
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="BESA SQL API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class QueryReq(BaseModel):
    sql: str
    case_id: str | None = None

@app.get("/health")
async def health():
    return {"status": "ok", "mode": API_MODE}

@app.get("/cases")
async def cases():
    out = []
    for y in pathlib.Path("cases").rglob("*.yaml"):
        out.append(yaml.safe_load(y.read_text()))
    return out

@app.post("/query")
async def query(q: QueryReq):
    if API_MODE == "server" and DATABASE_URL:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            rows = await conn.fetch(q.sql)
            return [dict(r) for r in rows]
        finally:
            await conn.close()
    con = duckdb.connect()
    try:
        return json.loads(con.execute(q.sql).fetchdf().to_json(orient="records"))
    finally:
        con.close()

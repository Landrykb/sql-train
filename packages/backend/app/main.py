from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os, yaml, pathlib, json, logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurable paths via env vars
CASES_DIR = os.getenv("CASES_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "cases"))
DATASETS_DIR = os.getenv("DATASETS_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "datasets"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# GitHub OAuth
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")

app = FastAPI(title="BESA SQL API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "https://bleepxacademy.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryReq(BaseModel):
    sql: str
    case_id: Optional[str] = None

@app.get("/health")
async def health():
    return {"status": "ok", "cases_dir": CASES_DIR, "datasets_dir": DATASETS_DIR}

@app.get("/api/cases")
async def list_cases():
    """List all cases from YAML files."""
    cases_path = pathlib.Path(CASES_DIR)
    if not cases_path.exists():
        logger.error(f"Cases directory not found: {CASES_DIR}")
        raise HTTPException(status_code=404, detail=f"Cases directory not found: {CASES_DIR}")
    out = []
    for y in cases_path.rglob("*.yaml"):
        try:
            out.append(yaml.safe_load(y.read_text()))
        except Exception as e:
            logger.warning(f"Failed to parse {y}: {e}")
    return out

@app.get("/api/cases/{domain}")
async def list_domain_cases(domain: str):
    """List cases for a specific domain."""
    domain_path = pathlib.Path(CASES_DIR) / domain
    if not domain_path.exists():
        raise HTTPException(status_code=404, detail=f"Domain not found: {domain}")
    out = []
    for y in domain_path.glob("*.yaml"):
        try:
            out.append(yaml.safe_load(y.read_text()))
        except Exception as e:
            logger.warning(f"Failed to parse {y}: {e}")
    return out

@app.post("/api/query")
async def query(q: QueryReq):
    """Execute a SQL query using pandas + pandasql."""
    try:
        import pandas as pd
        from pandasql import sqldf
        # Load all CSVs from datasets dir as tables
        data_env = {}
        datasets_path = pathlib.Path(DATASETS_DIR)
        if datasets_path.exists():
            for csv_file in datasets_path.glob("*.csv"):
                table_name = csv_file.stem
                data_env[table_name] = pd.read_csv(csv_file)
        result = sqldf(q.sql, data_env)
        return json.loads(result.to_json(orient="records"))
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=400, detail=f"Query failed: {str(e)}")

@app.get("/api/auth/github")
async def github_login():
    """Initiate GitHub OAuth login."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={GITHUB_CLIENT_ID}&"
        f"redirect_uri={BACKEND_URL}/github-callback&"
        f"scope=repo"
    )
    return {"url": auth_url}

@app.get("/github-callback")
async def github_callback(code: str):
    """Handle GitHub OAuth callback — exchange code, fetch user, redirect to frontend."""
    import requests
    from fastapi.responses import RedirectResponse
    from urllib.parse import urlencode
    try:
        response = requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"}
        )
        data = response.json()
        access_token = data.get("access_token")
        if not access_token:
            logger.error(f"GitHub token exchange failed: {data}")
            return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error=token_failed")

        # Fetch GitHub user profile
        user_resp = requests.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {access_token}", "Accept": "application/json"}
        )
        user = user_resp.json()
        params = urlencode({
            "login": user.get("login", ""),
            "name": user.get("name", "") or user.get("login", ""),
            "avatar": user.get("avatar_url", ""),
            "email": user.get("email", "") or "",
            "token": access_token,
        })
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?{params}")
    except Exception as e:
        logger.error(f"GitHub callback error: {e}")
        return RedirectResponse(f"{FRONTEND_URL}/auth/callback?error={str(e)}")

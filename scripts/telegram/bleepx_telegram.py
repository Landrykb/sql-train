#!/usr/bin/env python3
"""
Bleepx Telegram poster — broadcasts approved post packs to the Bleepx channel.

Design: post-only broadcaster (no polling, no command handling in v1).
The channel is the public face (owned by Landry's account); the bot is an
admin of the channel and is only the posting key.

Zero-cost stack: Python 3 + `requests` only. Runs anywhere — laptop,
Oracle Cloud VM, or invoked by the launch system.

Config (environment variables, never hardcode, never commit):
  BLEEPX_TG_BOT_TOKEN   BotFather token, e.g. 123456:ABC-DEF...
  BLEEPX_TG_CHANNEL     Channel username (@bleepxbuilds) or numeric id (-100...)

Usage:
  python3 bleepx_telegram.py ping                      # verify token + channel access
  python3 bleepx_telegram.py episode --pack pack.json  # post one episode pack
  python3 bleepx_telegram.py text --file note.txt      # plain text post
  python3 bleepx_telegram.py photo --file img.png --caption "..."
  Add --dry-run to any command to print the plan without sending.

Pack JSON format (the launch system emits one per episode):
  {
    "episode": "EP.01",
    "title": "The Fake Paywall",
    "video": "/path/to/reel.mp4",          // optional
    "cover": "/path/to/cover.png",         // optional; posted after the video
    "short_caption": "<=1024 chars, rides on the video",
    "full_text": "longer text, posted as a follow-up message (links clickable)",
    "link": "https://bleepxacademy.vercel.app/links"
  }
"""

import argparse
import json
import os
import sys
import time

import requests

API = "https://api.telegram.org/bot{token}/{method}"
CAPTION_LIMIT = 1024
TEXT_LIMIT = 4096


def esc(text: str) -> str:
    """Escape the three characters Telegram's HTML parse mode cares about."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Poster:
    def __init__(self, token: str, channel: str, dry_run: bool = False):
        self.token = token
        self.channel = channel
        self.dry_run = dry_run

    def call(self, method: str, data: dict, files: dict | None = None) -> dict:
        if self.dry_run:
            plan = {"method": method, "chat_id": self.channel, **data}
            if files:
                plan["files"] = {k: v[0] for k, v in files.items()}
            print("[dry-run]", json.dumps(plan, indent=2, ensure_ascii=False))
            return {"ok": True, "dry_run": True}
        url = API.format(token=self.token, method=method)
        for attempt in range(3):
            resp = requests.post(url, data=data, files=files, timeout=120)
            if resp.status_code == 429:
                wait = resp.json().get("parameters", {}).get("retry_after", 5)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            body = resp.json()
            if not body.get("ok"):
                raise RuntimeError(f"Telegram error on {method}: {body}")
            return body
        raise RuntimeError(f"Telegram kept rate-limiting {method}; try again later.")

    # -- primitives ------------------------------------------------------
    def send_text(self, text: str) -> None:
        for i in range(0, len(text), TEXT_LIMIT):
            self.call("sendMessage", {
                "chat_id": self.channel,
                "text": text[i:i + TEXT_LIMIT],
                "parse_mode": "HTML",
                "disable_web_page_preview": "false",
            })

    def send_photo(self, path: str, caption: str = "") -> None:
        with open(path, "rb") as fh:
            self.call("sendPhoto",
                      {"chat_id": self.channel, "caption": caption[:CAPTION_LIMIT],
                       "parse_mode": "HTML"},
                      files={"photo": (os.path.basename(path), fh)})

    def send_video(self, path: str, caption: str = "") -> None:
        with open(path, "rb") as fh:
            self.call("sendVideo",
                      {"chat_id": self.channel, "caption": caption[:CAPTION_LIMIT],
                       "parse_mode": "HTML", "supports_streaming": "true"},
                      files={"video": (os.path.basename(path), fh)})

    # -- composed posts ----------------------------------------------------
    def post_episode(self, pack: dict) -> None:
        header = f"<b>BUILD LOG · {esc(pack.get('episode', ''))} — {esc(pack.get('title', ''))}</b>"
        short = pack.get("short_caption", "").strip()
        caption = (header + "\n\n" + esc(short)).strip()
        if pack.get("video"):
            self.send_video(pack["video"], caption)
        else:
            self.send_text(caption)
        full = pack.get("full_text", "").strip()
        link = pack.get("link", "").strip()
        if full or link:
            body = esc(full)
            if link:
                body += f'\n\n<a href="{link}">Open the Academy</a>'
            self.send_text(body.strip())
        if pack.get("cover"):
            self.send_photo(pack["cover"], "")

    # -- interactive (listen mode) ----------------------------------------
    def send_chat_text(self, chat_id, text: str) -> None:
        """Reply in whatever chat asked — private DM or the linked discussion group."""
        for i in range(0, len(text), TEXT_LIMIT):
            self.call("sendMessage", {
                "chat_id": chat_id,
                "text": text[i:i + TEXT_LIMIT],
                "parse_mode": "HTML",
                "disable_web_page_preview": "false",
            })

    def poll(self, site_base: str = "https://bleepxacademy.vercel.app") -> None:
        """Long-poll getUpdates and answer commands — run wherever the bot should live."""
        offset = 0
        print(f"listening… (answers commands in DMs and groups the bot is in)")
        while True:
            updates = self.call("getUpdates", {"offset": offset, "timeout": 30})
            for upd in updates.get("result", []):
                offset = upd["update_id"] + 1
                msg = upd.get("message") or {}
                chat = msg.get("chat") or {}
                text = (msg.get("text") or "").strip()
                if not chat.get("id") or not text.startswith("/"):
                    continue
                cmd = text.split("@")[0].split()[0].lower()
                self.handle_command(chat["id"], cmd, site_base)

    def handle_command(self, chat_id, cmd: str, site_base: str) -> None:
        if cmd in ("/start", "/help"):
            self.send_chat_text(chat_id,
                "<b>Bleepx bot</b> — the arena's herald.\n\n"
                "/links — everything, one page\n"
                "/arena — enter the arena\n"
                "/standings — which brain wins the most")
        elif cmd == "/links":
            self.send_chat_text(chat_id, f"{site_base}/links")
        elif cmd == "/arena":
            self.send_chat_text(chat_id, f"{site_base}/arena")
        elif cmd == "/standings":
            self.send_standings(chat_id, site_base)
        else:
            self.send_chat_text(chat_id, "Unknown command — try /help")

    def send_standings(self, chat_id, site_base: str) -> None:
        try:
            data = requests.get(f"{site_base}/api/arena/brain-result", timeout=20).json()
            brains = data.get("brains", [])
        except Exception:
            brains = []
        if not brains:
            self.send_chat_text(chat_id, "No fights recorded yet — the board is waiting for its first brain.")
            return
        lines = [f"{i+1}. <b>{esc(b['model'])}</b> — {b['w']}W · {b['l']}L" for i, b in enumerate(brains[:10])]
        self.send_chat_text(chat_id, "<b>Brains scoreboard</b>\n" + "\n".join(lines))


def load_pack(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        pack = json.load(fh)
    for key in ("video", "cover"):
        if pack.get(key) and not os.path.exists(pack[key]):
            raise FileNotFoundError(f"pack {key} not found: {pack[key]}")
    return pack


def main() -> int:
    ap = argparse.ArgumentParser(description="Bleepx Telegram channel poster")
    ap.add_argument("--dry-run", action="store_true", help="print the plan, send nothing")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("ping", help="verify token + channel access")
    ls = sub.add_parser("listen", help="answer commands in DMs and discussion groups")
    ls.add_argument("--site", default="https://bleepxacademy.vercel.app")
    ep = sub.add_parser("episode", help="post an episode pack")
    ep.add_argument("--pack", required=True)
    tx = sub.add_parser("text", help="post a text message")
    tx.add_argument("--text")
    tx.add_argument("--file")
    ph = sub.add_parser("photo", help="post a photo")
    ph.add_argument("--file", required=True)
    ph.add_argument("--caption", default="")

    args = ap.parse_args()
    token = os.environ.get("BLEEPX_TG_BOT_TOKEN", "")
    channel = os.environ.get("BLEEPX_TG_CHANNEL", "")
    if not args.dry_run and (not token or not channel):
        print("Set BLEEPX_TG_BOT_TOKEN and BLEEPX_TG_CHANNEL (see README).", file=sys.stderr)
        return 2

    poster = Poster(token or "DRYRUN", channel or "@dryrun", dry_run=args.dry_run)

    if args.cmd == "ping":
        me = poster.call("getMe", {})
        chat = poster.call("getChat", {"chat_id": poster.channel})
        print("bot:", json.dumps(me.get("result", me), ensure_ascii=False))
        print("chat:", json.dumps(chat.get("result", chat), ensure_ascii=False))
    elif args.cmd == "listen":
        poster.poll(site_base=args.site)
    elif args.cmd == "episode":
        poster.post_episode(load_pack(args.pack))
        print("episode posted" if not args.dry_run else "dry run complete")
    elif args.cmd == "text":
        text = args.text or open(args.file, encoding="utf-8").read()
        poster.send_text(esc(text))
        print("text posted" if not args.dry_run else "dry run complete")
    elif args.cmd == "photo":
        poster.send_photo(args.file, esc(args.caption))
        print("photo posted" if not args.dry_run else "dry run complete")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

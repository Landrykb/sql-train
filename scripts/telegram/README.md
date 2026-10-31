# Bleepx on Telegram — the full stack

## Why this exists
A channel is an audience you **own**: no algorithm decides who sees a
post, and if Instagram ever throttles or locks the account, the channel
(plus the email list) is the audience you keep. Builders live on
Telegram, and Bleepx is a Telegram-native character in Landry's world.

## Architecture (bot or account? — both, in different jobs)

```
Landry's Telegram account (owner)
   └── creates + owns the public CHANNEL  ← the face; people subscribe here
         └── BOT added as channel admin   ← the posting key; automation only
               └── bleepx_telegram.py      ← posts approved packs via Bot API
                     ├── invoked by the launch system per episode (waterfall step)
                     └── or run by cron on the Oracle VM (standings, reminders)
```

- A **bot alone** is not a broadcast home — bots are for chats/commands.
- A **channel alone** cannot be automated.
- Together: your account owns it, the channel is the face, the bot is
  how the system posts. No connector or account linking — the bot
  token *is* the connection. Zero cost (Bot API is free).

## Setup (Landry, ~5 minutes, one time)
1. In Telegram: create a **public channel** (suggested: name
   "Bleepx — AI Build Log", username `@bleepxbuilds` if free).
2. Talk to **@BotFather** → `/newbot` → name it (e.g. "Bleepx Poster"),
   username must end in `bot` (e.g. `@bleepx_poster_bot`).
   BotFather returns the **token** — treat it like a password.
3. In the channel: Settings → Administrators → Add the bot →
   enable **Post Messages** (that's the only permission it needs).
4. Store the token via the Secure Vault (never paste it in chat,
   never commit it). On the machine that runs the poster:
   ```bash
   export BLEEPX_TG_BOT_TOKEN="123456:ABC-..."     # from the vault
   export BLEEPX_TG_CHANNEL="@bleepxbuilds"        # or the -100… id
   ```
   On the Oracle VM, put both in a `~/.bleepx-tg.env` file with
   `chmod 600`, and add `*.env` to `.gitignore` in any repo nearby.

## Run it
```bash
pip install requests            # the only dependency
python3 bleepx_telegram.py ping                       # verify wiring
python3 bleepx_telegram.py --dry-run episode --pack pack-ep01-sample.json
python3 bleepx_telegram.py episode --pack pack-ep01-sample.json
python3 bleepx_telegram.py text --file note.txt
python3 bleepx_telegram.py photo --file standings.png --caption "Brains standings"
```

## How it plugs into the system
- **Per episode (waterfall):** the launch pack gains one file —
  `pack-epNN.json` (format in `bleepx_telegram.py`'s docstring) —
  and the launch sequence calls `episode --pack …` after the IG post
  verifies. Telegram captions cap at 1,024 chars, so the pack carries
  a `short_caption` for the video and the `full_text` as a follow-up
  message. Unlike Instagram, **links are clickable here** — every
  episode post carries the /links URL directly.
- **Weekly:** Brains standings as a photo + text post (cron on the VM
  or the weekly review job).
- **Phase 2 (later, only if wanted):** link a discussion group to the
  channel for comments; give the bot commands (`/links`, `/arena`,
  `/standings`) — that turns the broadcaster into a small app, which
  is Landry's home turf. Not needed for launch.

## Safety rules
- The bot gets **post-only** admin rights — no ban/delete powers.
- Token lives in env/vault only. If it ever leaks: BotFather →
  `/revoke` → new token → update env. Nothing else changes.
- The poster only ever sends content from approved packs — same
  human gate as every other surface.

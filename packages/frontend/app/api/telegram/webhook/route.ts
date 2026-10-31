import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/telegram/webhook — always-on bot brain, serverless.
 *
 * Replaces the local `listen` polling loop: Telegram POSTs every incoming
 * message here; we answer via the Bot API. Set up once:
 *
 *   Env (Vercel → Project Settings → Environment Variables):
 *     BLEEPX_TG_BOT_TOKEN      BotFather token
 *     TELEGRAM_WEBHOOK_SECRET  any random string — proves calls are from Telegram
 *
 *   Then register the webhook (one GET, in a browser):
 *     https://api.telegram.org/bot<TOKEN>/setWebhook
 *       ?url=https://bleepxacademy.vercel.app/api/telegram/webhook
 *       &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Channels can't host commands — this answers in DMs and any group the bot is
 * a member of (e.g. the channel's linked discussion group).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN = process.env.BLEEPX_TG_BOT_TOKEN ?? '';
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? '';
const SITE = 'https://bleepxacademy.vercel.app';
const API = `https://api.telegram.org/bot${TOKEN}`;

async function sendText(chatId: number | string, text: string) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function standings(): Promise<string> {
  try {
    const res = await fetch(`${SITE}/api/arena/brain-result`, { cache: 'no-store' });
    const data = await res.json();
    const brains: { model: string; w: number; l: number }[] = data?.brains ?? [];
    if (!brains.length) return 'No fights recorded yet — the board is waiting for its first brain.';
    const lines = brains.slice(0, 10).map((b, i) => `${i + 1}. <b>${b.model}</b> — ${b.w}W · ${b.l}L`);
    return '<b>Brains scoreboard</b>\n' + lines.join('\n');
  } catch {
    return 'Scoreboard unreachable right now.';
  }
}

export async function POST(req: NextRequest) {
  // Prove the call came from Telegram, not a random poster.
  if (SECRET && req.headers.get('x-telegram-bot-api-secret-token') !== SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update?.message;
  const chatId = msg?.chat?.id;
  const text: string = msg?.text ?? '';
  if (!chatId || !text.startsWith('/') || !TOKEN) {
    return NextResponse.json({ ok: true });
  }

  const cmd = text.split('@')[0].split(' ')[0].toLowerCase();
  let reply: string;
  switch (cmd) {
    case '/start':
    case '/help':
      reply = '<b>Bleepx bot</b> — your guide.\n\n'
        + '/train — start training (SQL, Lab, Cloud)\n'
        + '/journey — your roadmap, week by week\n'
        + '/arena — fight for real\n'
        + '/standings — which brain wins the most\n'
        + '/links — everything, one page';
      break;
    case '/links':
      reply = `${SITE}/links`;
      break;
    case '/train':
      reply = `Pick your verse:\nSQL cases → ${SITE}/cases\nData science → ${SITE}/lab\nCloud missions → ${SITE}/cloud`;
      break;
    case '/journey':
      reply = `${SITE}/journey`;
      break;
    case '/arena':
      // Same guided fork as the site: train first, or straight in if experienced.
      reply = 'Know your stuff? Enter the arena → ' + `${SITE}/arena\n\n`
        + `New here? /train first — you'll fight the final round yourself, and your solves count as real progress.`;
      break;
    case '/standings':
      reply = await standings();
      break;
    default:
      reply = 'Unknown command — try /help';
  }

  await sendText(chatId, reply);
  return NextResponse.json({ ok: true });
}

// Telegram pings GET for webhook validation — answer 200 so it registers.
export async function GET() {
  return NextResponse.json({ ok: true, handler: 'bleepx-telegram' });
}

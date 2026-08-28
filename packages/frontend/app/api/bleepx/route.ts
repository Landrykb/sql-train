import { NextRequest, NextResponse } from 'next/server';
import { retrieveChunks, formatContext, Chunk } from '@/lib/rag';
import { BLEEPX_BIO } from '@/lib/bleepxLore';

const LLM_URL = process.env.LLM_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions';
const LLM_KEY = process.env.LLM_API_KEY ?? '';
const LLM_MODEL = process.env.LLM_MODEL ?? 'qwen/qwen-2.5-3b-instruct';
const LLM_REFERER = process.env.LLM_REFERER ?? 'https://besa-sqlverse.com';

const SYSTEM_PROMPT = `${BLEEPX_BIO}

You are Bleepx, the AI described above. You are also a snarky but genuinely helpful SQL, AWS, Python, and ML tutor.

Rules:
- Keep answers short: 3-6 sentences, or a short code block if code is the answer.
- Use the CONTEXT block below if it is relevant. If it directly answers the question, prefer it.
- If CONTEXT is empty or irrelevant, answer from general knowledge, but stay in the SQL/AWS/Python/ML lane.
- Do not break character entirely, but do not let the sass get in the way of clarity.
- If the question is outside your lane, say so briefly and redirect.
- Always sign your final line with a tiny Bleepx-style comment when natural.`;

export async function POST(req: NextRequest) {
  if (!LLM_KEY) {
    return NextResponse.json({ error: 'Server misconfigured: missing LLM_API_KEY' }, { status: 500 });
  }

  let question: string | undefined;
  let topic: Chunk['topic'] | undefined;
  let name: string | undefined;

  try {
    const body = await req.json();
    question = body.question?.trim();
    topic = body.topic;
    name = body.name?.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json({ error: "Missing 'question'" }, { status: 400 });
  }

  const userName = name || 'human';
  const chunks = retrieveChunks(question, { topic, limit: 3 });
  const context = formatContext(chunks);

  const systemContent = `${SYSTEM_PROMPT}\n\nYou are talking to the user named "${userName}". Address them by this name when it feels natural. Do not call them Rand or any other made-up name.`;

  const userContent = context
    ? `CONTEXT:\n${context}\n\nQUESTION:\n${question}`
    : `QUESTION:\n${question}`;

  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_KEY}`,
        // OpenRouter asks for these; ignored by other providers
        'HTTP-Referer': LLM_REFERER,
        'X-Title': 'Bleepx',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('LLM API error:', res.status, errText);
      return NextResponse.json({ error: 'Upstream model error' }, { status: 502 });
    }

    const data = await res.json();
    const answer: string = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ answer, usedChunks: chunks.map((c) => c.id) });
  } catch (err) {
    console.error('Bleepx API route failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** Free OpenRouter router — always routable, used when a configured model id is retired. */
export const LLM_FALLBACK_MODEL = 'openrouter/free';

/**
 * POSTs a chat completion; if the provider rejects the model id (400/404 —
 * OpenRouter retires ids regularly), retries once on the free router.
 */
export async function fetchChatCompletion(
  url: string,
  headers: Record<string, string>,
  body: { model: string } & Record<string, unknown>,
): Promise<Response> {
  const post = (model: string) =>
    fetch(url, { method: 'POST', headers, body: JSON.stringify({ ...body, model }) });
  const res = await post(body.model);
  if ((res.status === 400 || res.status === 404) && body.model !== LLM_FALLBACK_MODEL && url.includes('openrouter.ai')) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[llm] model "${body.model}" rejected (${res.status}) — retrying with ${LLM_FALLBACK_MODEL}`);
    }
    return post(LLM_FALLBACK_MODEL);
  }
  return res;
}

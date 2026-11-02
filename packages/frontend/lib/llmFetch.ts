/** Free OpenRouter router — always routable, used when a configured model id is retired. */
export const LLM_FALLBACK_MODEL = 'openrouter/free';

/**
 * POSTs a chat completion; if OpenRouter rejects the model id (retired ids
 * answer 404, or 400 naming the model), retries once on the free router.
 */
export async function fetchChatCompletion(
  url: string,
  headers: Record<string, string>,
  body: { model: string } & Record<string, unknown>,
): Promise<Response> {
  const post = (model: string) =>
    fetch(url, { method: 'POST', headers, body: JSON.stringify({ ...body, model }) });
  const res = await post(body.model);
  if (body.model === LLM_FALLBACK_MODEL || !url.includes('openrouter.ai')) return res;
  // 404 = no endpoint for the model; a 400 only counts when it blames the model id.
  const modelRejected =
    res.status === 404 ||
    (res.status === 400 && /model/i.test(await res.clone().text().catch(() => '')));
  if (modelRejected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[llm] model "${body.model}" rejected (${res.status}) — retrying with ${LLM_FALLBACK_MODEL}`);
    }
    return post(LLM_FALLBACK_MODEL);
  }
  return res;
}

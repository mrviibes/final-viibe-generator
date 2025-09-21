import { MODEL, TIMEOUT_MS, MAX_COMPLETION_TOKENS } from "./model.ts";

// Simple API call with better error handling and hard stop
export async function callModel(prompt: string, apiKey: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You return 4 lines only." },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        temperature: 0.8
      }),
      signal: ctrl.signal
    });

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      return { 
        ok: false, 
        error: `HTTP ${r.status}`, 
        message: errorData.error?.message || `Request failed with status ${r.status}` 
      };
    }

    const data = await r.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    
    return { 
      ok: true, 
      text, 
      meta: { 
        prompt_tokens: data.usage?.prompt_tokens, 
        completion_tokens: data.usage?.completion_tokens 
      } 
    };
  } catch (e: any) {
    return { 
      ok: false, 
      error: e.name || "error", 
      message: e.message || "failed", 
      aborted: e.name === "AbortError" 
    };
  } finally {
    clearTimeout(t);
  }
}
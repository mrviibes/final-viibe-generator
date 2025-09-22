import { MODEL, TIMEOUT_MS, MAX_COMPLETION_TOKENS } from "./model.ts";

// Enhanced API call with retries and better error handling
export async function callModel(prompt: string, apiKey: string, retryCount = 0): Promise<any> {
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
          { role: "system", content: "You generate visual prompts for AI image generation. Return exactly 4 visual concept lines. Each line is one sentence, max 15 words. CRITICAL: Text in images must be appropriately sized - never oversized or overwhelming." },
          { role: "user", content: prompt }
        ],
        max_completion_tokens: MAX_COMPLETION_TOKENS,
        // Remove temperature for gpt-5-mini (newer models don't support it)
      }),
      signal: ctrl.signal
    });

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `Request failed with status ${r.status}`;
      
      // Retry on specific errors (rate limit, timeout)
      if ((r.status === 429 || r.status >= 500) && retryCount < 2) {
        console.log(`Retrying API call (attempt ${retryCount + 1}/3) after ${r.status}: ${errorMsg}`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return callModel(prompt, apiKey, retryCount + 1);
      }
      
      return { 
        ok: false, 
        error: `HTTP ${r.status}`, 
        message: errorMsg,
        retries: retryCount
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
    // Retry on network errors
    if (e.name === "AbortError" && retryCount < 2) {
      console.log(`Retrying API call (attempt ${retryCount + 1}/3) after timeout`);
      clearTimeout(t);
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
      return callModel(prompt, apiKey, retryCount + 1);
    }
    
    return { 
      ok: false, 
      error: e.name || "error", 
      message: e.message || "failed", 
      aborted: e.name === "AbortError",
      retries: retryCount
    };
  } finally {
    clearTimeout(t);
  }
}
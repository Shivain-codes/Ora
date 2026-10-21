import { SYSTEM_PROMPT } from './prompt';
export function createGenerator(apiKey: string, model: string) {
  return async (context: unknown): Promise<string> => {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method:'POST', headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(60000),
      body:JSON.stringify({model, messages:[{role:'system',content:SYSTEM_PROMPT},{role:'user',content:JSON.stringify(context)}], chat_template_kwargs:{enable_thinking:false}, temperature:0, max_tokens:4096, stream:false, response_format:{type:'json_object'}}),
    });
    if (!response.ok) throw new Error(`NIM returned HTTP ${response.status}. Check model access, API key, and quota.`);
    const body = await response.json() as { choices?: {message?: {content?: unknown}}[] };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('NIM did not return a JSON message.');
    return content;
  };
}

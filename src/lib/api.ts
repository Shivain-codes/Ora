import type { Answer, Step } from '../../shared/types';
export const API_BASE=(import.meta.env.VITE_API_URL || '/api').replace(/\/$/,'');
export async function requestQuery(body: unknown, onStep:(step:Step)=>void, signal:AbortSignal):Promise<Answer> {
  const response=await fetch(`${API_BASE}/query`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(body),signal});
  if(!response.headers.get('content-type')?.includes('application/x-ndjson')) {
    const result=await response.json();
    if(!response.ok && !result.steps)throw new Error(result.explanation??'The request failed.');
    return result as Answer;
  }
  if(!response.body)throw new Error('The server returned no response stream.');
  const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let answer:Answer|undefined;
  function consume(line:string){if(!line.trim())return;const event=JSON.parse(line);if(event.type==='step')onStep(event.step);else if(event.type==='result')answer=event.answer;else if(event.type==='error')throw new Error(event.message);}
  try {for(;;){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split('\n');buffer=lines.pop()??'';lines.forEach(consume);if(done)break;}consume(buffer);}
  finally {reader.releaseLock();}
  if(!answer)throw new Error('The connection ended before the final answer. Please try again.');
  return answer;
}

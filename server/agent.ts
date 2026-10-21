import { randomUUID } from 'node:crypto';
import type { Answer, JsonDoc, Metrics, Plan, Step } from '../shared/types';
import { parsePlan, rejectUnsafeIntent, SafetyError, validatePlan } from './safety';
import { adviseChart } from './chart';
export interface Dependencies { schema(): Promise<unknown>; generate(context: unknown): Promise<string>; execute(plan: Plan): Promise<JsonDoc[]>; ready(): string | null }
interface Session { touched: number; schema?: unknown; previous?: {question:string;plan:Plan}; busy: boolean }
export class Agent {
  private sessions = new Map<string,Session>();
  private counts = {total:0,successful:0,refused:0,failed:0,repairAttempts:0,healed:0,latency:0};
  private hourly = new Map<string,number>();
  constructor(private deps: Dependencies) {}
  metrics(): Metrics {
    const c = this.counts;
    return {...c,averageLatencyMs:c.total ? Math.round(c.latency/c.total) : 0,repairRate:c.total ? c.repairAttempts/c.total*100 : 0,healingRate:c.total ? c.healed/c.total*100 : 0,series:[...this.hourly].map(([hour,queries])=>({hour,queries}))};
  }
  async run(input: {question?: unknown;sessionId?:unknown;followUp?:unknown}, emit: (step: Step)=>void = () => {}): Promise<{status:number;answer:Answer}> {
    const start = Date.now(); const steps: Step[] = [];
    const add = (stage:string,detail:string,status:Step['status']='complete') => { const step={stage,detail,status}; steps.push(step); emit(step); };
    let sessionId = typeof input.sessionId === 'string' ? input.sessionId : randomUUID();
    let plan: Plan | null = null; let results: JsonDoc[] = []; let repaired=false; let status=200; let explanation=''; let error: string | undefined;
    let session: Session | undefined; let ownsLock=false; let repairAttempted=false;
    try {
      if (!/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) throw new RequestError('sessionId must contain 8–80 letters, numbers, hyphens, or underscores.',400);
      if (input.followUp !== undefined && typeof input.followUp !== 'boolean' && typeof input.followUp !== 'string') throw new RequestError('followUp must be text or a boolean.',400);
      const question = typeof input.followUp === 'string' ? input.followUp.trim() : typeof input.question === 'string' ? input.question.trim() : '';
      if (!question || question.length > 2000) throw new RequestError('Ask a question between 1 and 2,000 characters.',400);
      rejectUnsafeIntent(question); // Before schema reads, model calls, or connection-dependent work.
      const readiness = this.deps.ready(); if (readiness) throw new RequestError(readiness,503);
      for (const [id,s] of this.sessions) if (!s.busy && Date.now()-s.touched > 3600000) this.sessions.delete(id);
      session = this.sessions.get(sessionId);
      if (input.followUp && !session?.previous) throw new RequestError('This session has no previous successful query, or it expired. Start a new question.',409);
      if (!session) {
        if (this.sessions.size >= 500) throw new RequestError('The session limit is reached. Try again after an inactive session expires.',429);
        session={touched:Date.now(),busy:false}; this.sessions.set(sessionId,session);
      }
      if (session.busy) throw new RequestError('Another question is running in this session. Wait for it to finish.',409);
      session.busy=true; ownsLock=true;
      add('Reading schema',session.schema ? 'Using this session’s cached schema.' : 'Reading field types and three sample movie documents.','running');
      if (!session.schema) session.schema = await this.deps.schema();
      add('Reading schema','Schema ready for sample_mflix.movies; inferred from three sample documents.');
      const context = {question,schema:session.schema,previous:input.followUp ? session.previous : undefined};
      let repair: unknown;
      for (let attempt=0; attempt<2; attempt++) {
        if (attempt) { repairAttempted=true; this.counts.repairAttempts++; add('Repairing…',JSON.stringify(repair,null,2),'running'); }
        else add('Writing query',input.followUp ? 'Refining the previous query with your follow-up.' : 'Generating a structured read-only MongoDB query.','running');
        let raw = '';
        try {
          raw = await this.deps.generate({...context,repair});
          const parsed = parsePlan(raw);
          add(attempt ? 'Repairing…':'Writing query',JSON.stringify(parsed,null,2));
          add('Safety check','Checking collection, operation, nested operators, and resource limits.','running');
          plan = validatePlan(parsed);
          add('Safety check','Allowed: sample_mflix.movies; approved read operations only; maximum 25 documents and 5 seconds.\n'+JSON.stringify(plan.query,null,2));
          add('Running',`Executing attempt ${attempt+1} of at most 2.`,'running');
          results = await this.deps.execute(plan);
          add('Running',`${results.length} document(s) returned.`);
          if (!results.length && attempt === 0) {
            repair={reason:'No results. Check field names and types once; preserve all user constraints. An empty result may be correct.',before:plan};
            continue;
          }
          repaired=attempt===1 && results.length>0;
          explanation = plan.explanation + (!results.length ? ' No matching documents were found after one repair review.' : '');
          session.previous={question,plan};
          break;
        } catch (err) {
          if (err instanceof SafetyError) throw err;
          const detail = safeError(err);
          add('Attempt failed',detail,'error');
          if (attempt===0) { repair={reason:detail,before:plan ?? raw.slice(0,24000)}; continue; }
          throw new RequestError('The query could not be completed after one repair attempt. '+detail,502);
        }
      }
      add('Responding',explanation);
      const chart = adviseChart(results);
      add('Chart advisor',chart ? `Suggested ${chart.type} chart: ${chart.title}.` : 'These results do not contain a suitable pair of flat chart axes.');
      add('Done',`${results.length} document(s). ${repairAttempted ? 'One repair review performed.' : 'No repair needed.'}`);
    } catch(err) {
      status = err instanceof SafetyError ? 422 : err instanceof RequestError ? err.status : 502;
      explanation = err instanceof SafetyError || err instanceof RequestError ? err.message : 'Could not read the sample dataset. Check Atlas connectivity, sample_mflix, and read-only permissions.';
      error = status===422 ? 'refused' : 'query_failed';
      add(status===422 ? 'Safety check':'Error',explanation,status===422?'refused':'error');
    } finally { if (session && ownsLock) {session.busy=false;session.touched=Date.now();} }
    const latencyMs=Date.now()-start;
    this.counts.total++; this.counts.latency+=latencyMs;
    if (status===200) this.counts.successful++; else if(status===422) this.counts.refused++; else this.counts.failed++;
    if (repaired) this.counts.healed++;
    const hour=new Date(start).toISOString().slice(0,13)+':00:00.000Z'; this.hourly.set(hour,(this.hourly.get(hour)??0)+1);
    if (this.hourly.size>168) this.hourly.delete(this.hourly.keys().next().value!);
    return {status,answer:{sessionId,mongoQuery:plan,explanation,results,steps,chartSpec:status===200?adviseChart(results):undefined,error,repaired,latencyMs}};
  }
}
class RequestError extends Error {constructor(message:string,public status:number){super(message);}}
function safeError(err: unknown) {
  const message=err instanceof Error ? err.message : 'Unknown query error';
  if (/mongodb(?:\+srv)?:\/\/|Bearer|nvapi-|password|credential/i.test(message)) return 'The database or model service rejected the request. Check server configuration.';
  return message.slice(0,600);
}

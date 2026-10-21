import React from 'react';
import { animated, useSpring, useTrail, useReducedMotion } from 'react-spring';
import { ArrowRight, ArrowUpRight, CheckCheck, Copy, Database, Fingerprint, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { ResultChart } from './chart';
import { API_BASE, requestQuery } from '../lib/api';
import type { Answer, JsonDoc, Metrics, Step } from '../../shared/types';
const examples=['Movies starring Tom Hanks released after 2000','Top 5 highest rated comedies','Movies released per year'];
function initialSession(){try{return sessionStorage.getItem('askmongo-session')||crypto.randomUUID();}catch{return crypto.randomUUID();}}
function Trace({steps}:{steps:Step[]}) {
  const reduce=useReducedMotion();const trail=useTrail(steps.length,{from:{opacity:0,x:reduce?0:8},opacity:1,x:0,immediate:!!reduce,config:{tension:260,friction:25}});
  return <section className="live-trace" aria-label="Agent trace"><h2><Fingerprint size={18}/>Agent trace</h2><ol>{trail.map((style,i)=><animated.li key={i} style={style} className={`step-${steps[i].status}`}><details open={steps[i].status==='refused'||steps[i].status==='error'}><summary><span className="step-dot"/><span>{steps[i].stage}</span><span className="step-status">{steps[i].status}</span></summary><pre>{steps[i].detail}</pre></details></animated.li>)}</ol></section>;
}
function Results({rows}:{rows:JsonDoc[]}) {
  const reduce=useReducedMotion();const trail=useTrail(rows.length,{from:{opacity:0,y:reduce?0:12},opacity:1,y:0,immediate:!!reduce,config:{tension:240,friction:24}});
  return <div className="result-grid">{trail.map((style,i)=><animated.article className="result-card" style={style} key={i}><div className="result-card-label">Document {i+1}</div><h3>{String(rows[i].title??rows[i].year??'Query result')}</h3>{typeof rows[i].plot==='string'&&<p>{rows[i].plot}</p>}<dl>{Object.entries(rows[i]).filter(([k])=>!['plot','fullplot','_id'].includes(k)).slice(0,5).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{typeof v==='object'?JSON.stringify(v):String(v)}</dd></div>)}</dl><details><summary>All fields</summary><pre>{JSON.stringify(rows[i],null,2)}</pre></details></animated.article>)}</div>;
}
function Loading() {
  const reduce=useReducedMotion();
  const shimmer=useSpring({from:{opacity:.2},to:{opacity:1},loop:reduce?false:{reverse:true},immediate:!!reduce,config:{duration:900}});
  return <div className="loading-state" role="status"><span className="loading-dot"/>Working through your question…<animated.div className="loading-shimmer" style={shimmer}/></div>;
}
function Dashboard() {
  const [metrics,setMetrics]=React.useState<Metrics>();const [error,setError]=React.useState('');
  const load=React.useCallback(async(signal?:AbortSignal)=>{try{const r=await fetch(`${API_BASE}/metrics`,{signal});if(!r.ok)throw new Error('Metrics could not be loaded.');setMetrics(await r.json());setError('');}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError('Cannot reach metrics. Check that the API server is running.');}},[]);
  React.useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  return <section className="dashboard"><div className="dashboard-heading"><div><h1>Your questions, in perspective.</h1><p>Real server activity. Counters reset when the server restarts.</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw size={14}/>Refresh</Button></div>{error&&<p role="alert" className="error-panel">{error}</p>}{metrics?<><div className="metric-grid"><article><span>Questions completed</span><strong>{metrics.total}</strong><small>{metrics.successful} successful · {metrics.refused} refused · {metrics.failed} failed</small></article><article><span>Average latency</span><strong>{(metrics.averageLatencyMs/1000).toFixed(2)}<small>s</small></strong><small>All completed requests, including failures</small></article><article><span>Repair rate</span><strong>{metrics.repairRate.toFixed(0)}<small>%</small></strong><small>Self-healed {metrics.healingRate.toFixed(0)}% of queries</small></article></div>{metrics.series.length?<ResultChart rows={metrics.series.map(p=>({hour:new Date(p.hour).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit'}),queries:p.queries}))} spec={{type:'bar',xKey:'hour',yKey:'queries',title:'Queries over time · hourly'}}/>:<div className="empty-state">No queries yet. Ask your first question in the console.</div>}<p className="metrics-note">Self-healed means a failed or empty first attempt returned documents after repair. A successful empty answer is not counted as self-healed.</p></>:!error&&<p role="status">Loading server metrics…</p>}</section>;
}
export function Console() {
  const [tab,setTab]=React.useState<'console'|'dashboard'>('console');
  const [question,setQuestion]=React.useState(new URLSearchParams(location.search).get('example')==='tom-hanks'?examples[0]:'');
  const [followUp,setFollowUp]=React.useState('');const [sessionId,setSessionId]=React.useState(initialSession);
  const [steps,setSteps]=React.useState<Step[]>([]);const [answer,setAnswer]=React.useState<Answer>();const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState('');const [health,setHealth]=React.useState('Checking server connection…');const [copied,setCopied]=React.useState(false);const [focused,setFocused]=React.useState(false);const [canFollow,setCanFollow]=React.useState(false);
  const controller=React.useRef<AbortController|null>(null);const reduce=useReducedMotion();
  const glow=useSpring({opacity:focused?1:0,immediate:!!reduce,config:{tension:200,friction:24}});
  React.useEffect(()=>{const abort=new AbortController();fetch(`${API_BASE}/health`,{signal:abort.signal}).then(r=>r.json()).then(h=>setHealth(h.message??'Server status unavailable.')).catch(e=>{if(e.name!=='AbortError')setHealth('Cannot reach the API. Start the backend, then refresh this page.');});return()=>{abort.abort();controller.current?.abort();};},[]);
  async function submit(isFollow=false){
    const text=(isFollow?followUp:question).trim();if(!text||busy)return;
    setBusy(true);setSteps([]);setAnswer(undefined);setError('');setCopied(false);
    const id=isFollow?sessionId:crypto.randomUUID();setSessionId(id);try{sessionStorage.setItem('askmongo-session',id);}catch{/* Storage may be disabled. */}
    controller.current=new AbortController();
    try {const result=await requestQuery({question:text,sessionId:id,followUp:isFollow},s=>setSteps(previous=>[...previous,s]),controller.current.signal);setAnswer(result);setSteps(result.steps);setSessionId(result.sessionId);setCanFollow(!result.error);if(result.error)setError(result.explanation);else setFollowUp('');}
    catch(e){setError(e instanceof Error?e.message:'The query failed.');setCanFollow(false);}
    finally{setBusy(false);}
  }
  async function copy(){try{await navigator.clipboard.writeText(JSON.stringify(answer?.mongoQuery,null,2));setCopied(true);}catch{setError('Clipboard access was unavailable. Select the query text to copy it.');}}
  return <main className="workspace shell"><div className="console-topline"><span><Database size={15}/>sample_mflix.movies</span><span><ShieldCheck size={15}/>Read-only</span></div><div className="workspace-tabs" role="tablist" aria-label="Workspace"><button role="tab" aria-selected={tab==='console'} aria-controls="console-panel" id="console-tab" onClick={()=>setTab('console')}>Console</button><button role="tab" aria-selected={tab==='dashboard'} aria-controls="dashboard-panel" id="dashboard-tab" onClick={()=>setTab('dashboard')}>Dashboard</button></div>
    {tab==='dashboard'?<div role="tabpanel" id="dashboard-panel" aria-labelledby="dashboard-tab"><Dashboard/></div>:<div role="tabpanel" id="console-panel" aria-labelledby="console-tab"><div className="workspace-intro"><h1>Let your curiosity lead.</h1><p>Ask a question. Follow the query. Understand the answer.</p></div><p className="connection-state" role="status">{health}</p><form onSubmit={e=>{e.preventDefault();void submit();}}><label htmlFor="question" className="sr-only">Ask a question about movies</label><div className="query-input"><animated.span className="input-glow" style={glow}/><Sparkles size={20}/><input id="question" value={question} onChange={e=>setQuestion(e.target.value)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} placeholder="What would you like to know?" maxLength={2000} required disabled={busy}/><Button disabled={busy||!question.trim()} type="submit" aria-label="Ask your question"><ArrowRight size={19}/></Button></div></form>
    {!answer&&!busy&&<div className="example-questions">{examples.map(example=><button key={example} onClick={()=>{setQuestion(example);document.getElementById('question')?.focus();}}>{example}<ArrowUpRight size={14}/></button>)}</div>}
    {busy&&<Loading/>}
    {error&&<div className="error-panel" role="alert"><ShieldCheck size={18}/><p>{error}</p></div>}
    {(steps.length>0||answer)&&<div className="answer-layout"><Trace steps={steps}/><section className="answer-content" aria-label="Query answer">{answer&&<><div className="answer-summary"><span>{answer.error?'Query not completed':`${answer.results.length} document(s) · ${(answer.latencyMs/1000).toFixed(2)}s`}</span><p>{answer.explanation}</p></div>{answer.mongoQuery&&<div className="generated-query"><div><h2>MongoDB query</h2><button onClick={()=>void copy()} aria-label="Copy generated query">{copied?<CheckCheck size={16}/>:<Copy size={16}/>}<span>{copied?'Copied':'Copy'}</span></button></div><pre>{JSON.stringify(answer.mongoQuery,null,2)}</pre></div>}{answer.chartSpec&&<ResultChart rows={answer.results} spec={answer.chartSpec}/>}<Results rows={answer.results}/>{!answer.error&&!answer.results.length&&<div className="empty-state">No matching documents. Try a different question or refine the filters below.</div>}</>}</section></div>}
    {canFollow&&!busy&&<form className="follow-up" onSubmit={e=>{e.preventDefault();void submit(true);}}><label htmlFor="followup">Keep the conversation going</label><div className="query-input"><input id="followup" placeholder="Now only comedies…" value={followUp} onChange={e=>setFollowUp(e.target.value)} maxLength={2000} required/><Button type="submit" disabled={!followUp.trim()}>Refine<ArrowRight size={16}/></Button></div><small>Refines the previous query in this session. The main question bar starts a new analysis.</small></form>}
    {!steps.length&&!busy&&<div className="console-empty"><Fingerprint size={28}/><p>The path to an answer should be visible.</p><span>Your query, safety checks, and results will appear here.</span></div>}</div>}
  </main>;
}

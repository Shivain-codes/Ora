import express from 'express';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { Database } from './database';
import { Agent } from './agent';
import { createGenerator } from './nim';
if (existsSync('.env')) loadEnvFile('.env');
const missing = ['MONGODB_URI','NIM_API_KEY'].filter(k=>!process.env[k]?.trim());
let readiness: string | null = missing.length ? `Server setup required: add ${missing.join(' and ')} to .env, then restart the server.` : 'Connecting to Atlas and verifying read-only permissions.';
const db=missing.length ? undefined : new Database(process.env.MONGODB_URI!);
const agent=new Agent({
  ready:()=>readiness,
  schema:()=>db!.schema(), execute:plan=>db!.execute(plan),
  generate:createGenerator(process.env.NIM_API_KEY ?? '',process.env.NIM_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b'),
});
const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'16kb'}));
app.get('/api/health',(_req,res)=>res.status(readiness ? 503:200).json({status:readiness?'unavailable':'ok',databaseConnected:!readiness,readOnlyVerified:!readiness,message:readiness ?? 'Ready. Read-only Atlas access verified.'}));
app.get('/api/metrics',(_req,res)=>res.json(agent.metrics()));
let active=0;
app.post('/api/query',async(req,res)=>{
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {res.status(400).json({explanation:'Send a JSON object with question and optional sessionId.'});return;}
  if(active>=8){res.status(429).json({explanation:'The server is busy. Please try again shortly.'});return;}
  active++;
  const streaming=req.accepts(['application/x-ndjson','application/json'])==='application/x-ndjson' && req.get('accept')?.includes('application/x-ndjson');
  if(streaming){res.set({'Content-Type':'application/x-ndjson','Cache-Control':'no-store','X-Accel-Buffering':'no'});res.flushHeaders();}
  try {
    const {status,answer}=await agent.run(req.body,step=>{if(streaming&&!res.destroyed)res.write(JSON.stringify({type:'step',step})+'\n');});
    if(streaming){if(!res.destroyed)res.end(JSON.stringify({type:'result',status,answer})+'\n');}
    else res.status(status).json(answer);
  } catch { if(streaming)res.end(JSON.stringify({type:'error',message:'Unexpected server error.'})+'\n');else res.status(500).json({explanation:'Unexpected server error.'}); }
  finally {active--;}
});
app.use((err: unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(400).json({explanation:'Invalid or oversized JSON request. Maximum request size is 16 KB.'});});
const port=Number(process.env.PORT??3001);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer between 1 and 65535.');
const server=app.listen(port,'127.0.0.1',()=>console.log(`AskMongo API: http://127.0.0.1:${port}`));
if(missing.length)console.error('STARTUP CONFIGURATION ERROR: '+readiness);
else db!.connect().then(()=>{readiness=null;console.log('Atlas read-only role verified. Ready for queries.');}).catch(()=>{readiness='Atlas verification failed. Confirm connectivity and give this user only the built-in read role on sample_mflix, then restart.';console.error('STARTUP CONFIGURATION ERROR: '+readiness);void db!.close();});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{server.close();void db?.close().finally(()=>process.exit(0));if(!db)process.exit(0);});

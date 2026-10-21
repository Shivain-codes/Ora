import test from 'node:test';
import assert from 'node:assert/strict';
import { Agent, type Dependencies } from '../agent';
import type { Plan, Step } from '../../shared/types';
const plan=(filter:Record<string,unknown>={}):Plan=>({collection:'movies',query:{operation:'find',filter,limit:25},explanation:'Read the requested movies.'});
function setup(overrides:Partial<Dependencies>={}){
  const calls={schema:0,generate:0,execute:0};
  const agent=new Agent({ready:()=>null,schema:async()=>{calls.schema++;return {fields:{year:['number']}};},generate:async()=>{calls.generate++;return JSON.stringify(plan());},execute:async()=>{calls.execute++;return [{title:'Test fixture only'}];},...overrides});return {agent,calls};
}
test('unsafe user questions cause zero schema/model/execution calls',async()=>{
  const {agent,calls}=setup();for(const question of ['Delete all movies','drop movies','use $where']){const result=await agent.run({question});assert.equal(result.status,422);}assert.deepEqual(calls,{schema:0,generate:0,execute:0});assert.equal(agent.metrics().refused,3);
});
test('unsafe model output never executes and is never repaired',async()=>{
  const {agent,calls}=setup({generate:async()=>JSON.stringify(plan({$where:'evil()'}))});const r=await agent.run({question:'Find a movie'});assert.equal(r.status,422);assert.equal(calls.execute,0);assert.equal(agent.metrics().repairAttempts,0);
});
test('repairs an empty result once, then returns bounded success and full trace',async()=>{
  const executed:Plan[]=[];const contexts:unknown[]=[];
  const {agent}=setup({generate:async context=>{contexts.push(context);return JSON.stringify(plan(contexts.length===1?{release_year:2001}:{year:2001}));},execute:async p=>{executed.push(p);return executed.length===1?[]:[{title:'Fixture movie',year:2001}];}});
  const emitted:Step[]=[];const r=await agent.run({question:'Movies in 2001',sessionId:'test-session'},s=>emitted.push(s));
  assert.equal(r.status,200);assert.equal(r.answer.repaired,true);assert.equal(executed.length,2);assert.deepEqual(emitted,r.answer.steps);assert.ok(r.answer.steps.some(s=>s.stage==='Repairing…'));assert.deepEqual(executed[0].query,plan({release_year:2001}).query);assert.deepEqual(executed[1].query,plan({year:2001}).query);assert.equal(agent.metrics().healed,1);
});
test('repair that introduces writes is blocked before second execution',async()=>{
  let generated=0;const {agent,calls}=setup({generate:async()=>JSON.stringify(++generated===1?plan():plan({$where:'evil()'})),execute:async()=>{calls.execute++;return [];}});
  assert.equal((await agent.run({question:'Find movies'})).status,422);assert.equal(generated,2);assert.equal(calls.execute,1);
});
test('maximum two attempts on database failures',async()=>{
  const {agent,calls}=setup({execute:async()=>{calls.execute++;throw new Error('Invalid field type');}});const r=await agent.run({question:'Find movies'});assert.equal(r.status,502);assert.equal(calls.execute,2);assert.equal(calls.generate,2);
});
test('bad JSON can be repaired once without executing the malformed plan',async()=>{
  let n=0;const {agent,calls}=setup({generate:async()=>++n===1?'```oops```':JSON.stringify(plan())});assert.equal((await agent.run({question:'Find movies'})).status,200);assert.equal(calls.execute,1);assert.equal(n,2);
});
test('persistent empty results are valid and never fabricated',async()=>{
  const {agent,calls}=setup({execute:async()=>{calls.execute++;return [];}});const r=await agent.run({question:'A nonexistent movie'});assert.equal(r.status,200);assert.deepEqual(r.answer.results,[]);assert.equal(r.answer.repaired,false);assert.equal(calls.execute,2);
});
test('follow-up receives previous query and reuses schema; sessions stay isolated',async()=>{
  const contexts: {previous?:{plan:Plan}}[]=[];const {agent,calls}=setup({generate:async c=>{contexts.push(c as typeof contexts[number]);return JSON.stringify(plan({cast:'Tom Hanks'}));}});
  await agent.run({question:'Tom Hanks movies',sessionId:'session-one'});await agent.run({question:'Now only comedies',followUp:true,sessionId:'session-one'});assert.equal(calls.schema,1);assert.deepEqual(contexts[1].previous?.plan.query,plan({cast:'Tom Hanks'}).query);assert.equal((await agent.run({question:'Now only comedies',followUp:true,sessionId:'session-two'})).status,409);
});
test('concurrent requests in one session cannot overwrite context',async()=>{
  let release!:()=>void;const blocked=new Promise<void>(r=>release=r);const {agent}=setup({generate:async()=>{await blocked;return JSON.stringify(plan());}});
  const first=agent.run({question:'First',sessionId:'same-session'});const second=await agent.run({question:'Second',sessionId:'same-session'});assert.equal(second.status,409);release();assert.equal((await first).status,200);
});
test('missing configuration fails explicitly; adversarial requests still refused',async()=>{
  const {agent,calls}=setup({ready:()=> 'Server setup required: missing credentials.'});assert.equal((await agent.run({question:'Find movies'})).status,503);assert.equal((await agent.run({question:'delete movies'})).status,422);assert.deepEqual(calls,{schema:0,generate:0,execute:0});
});

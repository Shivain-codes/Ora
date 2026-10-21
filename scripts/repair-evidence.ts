import { writeFile } from 'node:fs/promises';
import { Agent } from '../server/agent';
import type { Plan } from '../shared/types';
const plans:Plan[]=[];
const agent=new Agent({ready:()=>null,schema:async()=>({fields:{year:['number']},samples:[{year:2001}]}),
  generate:async()=>JSON.stringify({collection:'movies',query:{operation:'find',filter:plans.length?{year:2001}:{release_year:2001},limit:25},explanation:'Find movies released in 2001.'}),
  execute:async plan=>{plans.push(plan);return plans.length===1?[]:[{title:'TEST FIXTURE — not an Atlas movie',year:2001}];},
});
const result=await agent.run({question:'Movies from 2001',sessionId:'repair-evidence-fixture'});
await writeFile('review/repair-fixture.json',JSON.stringify({evidence:'DETERMINISTIC UNIT FIXTURE ONLY. No Atlas or NVIDIA calls. Live repair check pending credentials.',before:plans[0],after:plans[1],response:result.answer},null,2)+'\n');
console.log('Wrote review/repair-fixture.json (test fixture, not live results).');

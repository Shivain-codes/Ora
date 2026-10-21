import test from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../database';
import type { Plan } from '../../shared/types';
test('database adapter independently caps documents and time for find and aggregate',async()=>{
  const options:Record<string,unknown>[]=[];let closed=0;const pipelines:unknown[]=[];
  const cursor=()=>({async *[Symbol.asyncIterator](){for(let i=0;i<40;i++)yield {year:2000+i};},async close(){closed++;}});
  const db=new Database('mongodb://127.0.0.1:27017');
  // Inject a driver spy, never a database, to verify the actual adapter boundary.
  Object.assign(db,{client:{db:(name:string)=>{assert.equal(name,'sample_mflix');return {collection:(name:string)=>{assert.equal(name,'movies');return {find:(_filter:unknown,opts:Record<string,unknown>)=>{options.push(opts);return cursor();},aggregate:(pipeline:unknown,opts:Record<string,unknown>)=>{pipelines.push(pipeline);options.push(opts);return cursor();}};}};}}});
  const first=await db.execute({collection:'movies',query:{operation:'find',filter:{},limit:1000},explanation:'fixture'} as Plan);
  const second=await db.execute({collection:'movies',query:{operation:'aggregate',pipeline:[{$match:{}}]},explanation:'fixture'});
  assert.equal(first.length,25);assert.equal(second.length,25);assert.equal(closed,2);
  assert.equal(options[0].limit,25);for(const opts of options){assert.equal(opts.maxTimeMS,5000);assert.equal(opts.timeoutMS,5000);}
  assert.deepEqual((pipelines[0] as unknown[]).at(-1),{$limit:25});assert.equal(options[1].allowDiskUse,false);
});

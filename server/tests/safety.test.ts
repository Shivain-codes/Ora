import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan, validatePlan, rejectUnsafeIntent, SafetyError } from '../safety';
import { assertReadOnlyRoles } from '../database';
const plan=(query:unknown)=>({collection:'movies',query,explanation:'Read matching movies.'});
const find=(filter:unknown={})=>plan({operation:'find',filter,limit:25});
test('strict JSON parser accepts one plan',()=>assert.deepEqual(parsePlan(JSON.stringify(find())),find()));
for(const value of ['```json\n{}\n```','Here is the query: {}','{} trailing','[]','null','{"collection":"movies"}','{"collection":"movies","query":{},"explanation":"x","extra":1}','{"collection":"movies","query":{},"explanation":NaN}'])test(`parser rejects ${value.slice(0,40)}`,()=>assert.throws(()=>parsePlan(value)));
test('document cap is clamped and cannot be zero or negative',()=>{
  const result=validatePlan(plan({operation:'find',filter:{},limit:1000}));assert.equal(result.query.operation==='find'&&result.query.limit,25);
  for(const limit of [0,-1,1.5,'25'])assert.throws(()=>validatePlan(plan({operation:'find',filter:{},limit})),SafetyError);
});
for(const op of ['$where','$function','$accumulator','$out','$merge','$lookup','$unionWith','$graphLookup','$facet','$currentOp','$documents','$unknown'])test(`rejects nested ${op}`,()=>assert.throws(()=>validatePlan(find({$and:[{title:{[op]:'bad'}}]})),SafetyError));
for(const operation of ['delete','deleteMany','drop','insertOne','updateMany','mapReduce','findOneAndUpdate'])test(`rejects operation ${operation}`,()=>assert.throws(()=>validatePlan(plan({operation,filter:{}})),SafetyError));
for(const question of ['Delete all movies','drop the movies collection','run $where injection','mapReduce movies','insert a movie','update all ratings'])test(`refuses intent: ${question}`,()=>assert.throws(()=>rejectUnsafeIntent(question),SafetyError));
test('aggregation stage allowlist and final cap',()=>{
  const result=validatePlan(plan({operation:'aggregate',pipeline:[{$group:{_id:'$year',count:{$sum:1}}}]}));
  assert.deepEqual(result.query.operation==='aggregate'&&result.query.pipeline.at(-1),{$limit:25});
  for(const stage of [{$out:'movies'},{$merge:'movies'},{$facet:{nested:[{$out:'movies'}]}},{$lookup:{from:'users'}},{$match:{},$out:'movies'}])assert.throws(()=>validatePlan(plan({operation:'aggregate',pipeline:[stage]})),SafetyError);
});
test('rejects alternative collections, options, dangerous keys and code projection',()=>{
  assert.throws(()=>validatePlan({...find(),collection:'users'}));
  assert.throws(()=>validatePlan(plan({operation:'find',filter:{},maxTimeMS:100000})));
  assert.throws(()=>validatePlan(parsePlan('{"collection":"movies","query":{"operation":"find","filter":{"__proto__":{"x":1}}},"explanation":"x"}')));
  assert.throws(()=>validatePlan(plan({operation:'find',filter:{},projection:{title:{$function:{}}}})));
});
test('read-only role proof fails closed',()=>{
  // Accepted: scoped read on sample_mflix (preferred), and the broader read-only readAnyDatabase.
  assertReadOnlyRoles([{role:'read',db:'sample_mflix'}]);
  assertReadOnlyRoles([{role:'readAnyDatabase',db:'admin'}]);
  // Refused: empty/unverifiable, any write or admin role, wrong db scope, readAnyDatabase off admin,
  // a read-only role mixed with a privileged one, and unknown custom roles.
  for(const roles of [undefined,[],[{role:'readWrite',db:'sample_mflix'}],[{role:'read',db:'other'}],[{role:'readAnyDatabase',db:'sample_mflix'}],[{role:'atlasAdmin',db:'admin'}],[{role:'read',db:'sample_mflix'},{role:'root',db:'admin'}],[{role:'readAnyDatabase',db:'admin'},{role:'readWrite',db:'sample_mflix'}],[{role:'customRead',db:'sample_mflix'}]])assert.throws(()=>assertReadOnlyRoles(roles));
});

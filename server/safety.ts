import type { Plan, JsonDoc, Query } from '../shared/types';
export class SafetyError extends Error {}
export const MAX_DOCS = 25;
export const MAX_TIME_MS = 5000;
const operators = new Set(['$eq','$ne','$gt','$gte','$lt','$lte','$in','$nin','$and','$or','$nor','$not','$exists','$type','$regex','$options','$elemMatch','$size','$all','$expr','$match','$group','$sort','$limit','$skip','$project','$unwind','$count','$sum','$avg','$min','$max','$first','$last','$add','$subtract','$multiply','$divide','$round','$ifNull','$cond','$switch','$toInt','$toDouble','$toString','$convert','$year','$month','$dayOfMonth','$dateToString','$dateFromString','$toDate','$isNumber','$isArray','$filter','$map','$arrayElemAt','$concat','$substrCP','$toLower','$toUpper','$literal']);
const stages = new Set(['$match','$group','$sort','$limit','$skip','$project','$unwind','$count']);
export function object(value: unknown): value is JsonDoc { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function refuse(message: string): never { throw new SafetyError(message); }
export function rejectUnsafeIntent(question: string) {
  if (/\$(where|function|accumulator|out|merge)\b|\bmapreduce\b|\b(delete(?:One|Many)?|drop(?:Database|Collection)?|insert(?:One|Many)?|update(?:One|Many)?|remove|replace(?:One)?|truncate|create(?:Collection|Index)?|rename(?:Collection)?|write|bulkWrite|findOneAndUpdate|findOneAndDelete|findOneAndReplace|erase)\b/i.test(question)) {
    refuse('AskMongo is read-only. I cannot write, delete, drop, or execute JavaScript in the database. Ask a question that reads movies instead.');
  }
}
function walk(value: unknown, depth = 0, budget = { nodes: 0 }) {
  if (++budget.nodes > 3000 || depth > 16) refuse('This query is too complex to run safely.');
  if (typeof value === 'number' && !Number.isFinite(value)) refuse('Query numbers must be finite.');
  if (typeof value === 'string' && value.length > 2000) refuse('Query values must be at most 2,000 characters.');
  if (Array.isArray(value)) { if (value.length > 100) refuse('Query arrays are limited to 100 items.'); value.forEach(v => walk(v, depth + 1, budget)); }
  else if (value && typeof value === 'object') {
    if (!object(value)) refuse('Only plain JSON objects are accepted.');
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__','prototype','constructor'].includes(key) || key.includes('\0')) refuse('This query contains an unsafe field name.');
      if (key.startsWith('$') && !operators.has(key)) refuse(`The operator ${key} is not allowed. Only approved read operations can run.`);
      if (key === '$regex' && (typeof child !== 'string' || child.length > 100)) refuse('Search patterns must be strings of at most 100 characters.');
      walk(child, depth + 1, budget);
    }
  }
}
function keys(value: JsonDoc, allowed: string[]) { if (Object.keys(value).some(k => !allowed.includes(k))) refuse('The query contains unsupported options.'); }
function limit(value: unknown) { if (value !== undefined && (!Number.isInteger(value) || Number(value) < 1)) refuse('The document limit must be a positive integer.'); return Math.min(Number(value ?? MAX_DOCS), MAX_DOCS); }
export function validatePlan(value: unknown): Plan {
  if (!object(value)) refuse('The model must return a JSON object.');
  keys(value, ['collection','query','explanation']);
  if (value.collection !== 'movies') refuse('Only sample_mflix.movies may be queried.');
  if (typeof value.explanation !== 'string' || !value.explanation.trim() || value.explanation.length > 2000) refuse('The query must include a short plain-English explanation.');
  if (!object(value.query)) refuse('The model must provide a structured query.');
  const q = value.query;
  walk(q);
  let query: Query;
  if (q.operation === 'find') {
    keys(q, ['operation','filter','projection','sort','limit']);
    if (!object(q.filter)) refuse('A find query requires a filter object.');
    for (const field of ['projection','sort']) if (q[field] !== undefined) {
      if (!object(q[field]) || Object.entries(q[field]).some(([k,v]) => k.startsWith('$') || !(field === 'sort' ? [1,-1] : [0,1]).includes(Number(v)) || typeof v !== 'number')) refuse(`Invalid ${field} options.`);
    }
    query = { operation:'find', filter:q.filter, limit:limit(q.limit), ...(q.projection ? { projection:q.projection as Record<string,0|1> } : {}), ...(q.sort ? {sort:q.sort as Record<string,1|-1>} : {}) };
  } else if (q.operation === 'aggregate') {
    keys(q, ['operation','pipeline']);
    if (!Array.isArray(q.pipeline) || !q.pipeline.length || q.pipeline.length > 12) refuse('An aggregation needs between 1 and 12 stages.');
    for (const stage of q.pipeline) {
      if (!object(stage) || Object.keys(stage).length !== 1 || !stages.has(Object.keys(stage)[0])) refuse('Only approved read-only aggregation stages may run. Joins, nested pipelines, and write stages are disabled.');
      if ('$limit' in stage) stage.$limit = limit(stage.$limit);
      if ('$skip' in stage && (!Number.isInteger(stage.$skip) || Number(stage.$skip) < 0 || Number(stage.$skip) > 10000)) refuse('Skip must be between 0 and 10,000.');
    }
    query = {operation:'aggregate',pipeline:[...q.pipeline as JsonDoc[], {$limit:MAX_DOCS}]};
  } else refuse('Only find and aggregate are allowed. No write, delete, or administrative operation can run.');
  return {collection:'movies',query,explanation:value.explanation};
}
export function parsePlan(text: string): unknown {
  if (text.length > 24000 || !text.trim().startsWith('{') || !text.trim().endsWith('}')) throw new Error('The model response must be one JSON object without prose or markdown.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('The model returned invalid JSON.'); }
  if (!object(value) || Object.keys(value).sort().join(',') !== 'collection,explanation,query') throw new Error('The response must contain exactly collection, query, and explanation.');
  return value;
}

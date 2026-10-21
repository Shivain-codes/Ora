import { MongoClient, type Document } from 'mongodb';
import type { Plan, JsonDoc } from '../shared/types';
import { MAX_DOCS, MAX_TIME_MS } from './safety';
export function assertReadOnlyRoles(roles: unknown) {
  if (!Array.isArray(roles) || !roles.length || roles.some(r => r?.role !== 'read' || r?.db !== 'sample_mflix')) throw new Error('Atlas user must have only the built-in read role on sample_mflix. Remove all other roles; AskMongo refuses unverified or writable credentials.');
}
export class Database {
  private client: MongoClient;
  constructor(uri: string) { this.client = new MongoClient(uri, { serverSelectionTimeoutMS:5000, connectTimeoutMS:5000, socketTimeoutMS:5000, timeoutMS:5000, maxPoolSize:5 }); }
  async connect() {
    await this.client.connect();
    // Fixed metadata command only, never model-controlled. No attempted write probes.
    const status = await this.client.db('sample_mflix').command({connectionStatus:1}, {timeoutMS:MAX_TIME_MS});
    assertReadOnlyRoles(status.authInfo?.authenticatedUserRoles);
  }
  async execute(plan: Plan): Promise<JsonDoc[]> {
    const collection = this.client.db('sample_mflix').collection('movies');
    const q = plan.query;
    const cursor = q.operation === 'find'
      ? collection.find(q.filter, {projection:q.projection, sort:q.sort, limit:Math.min(q.limit, MAX_DOCS), maxTimeMS:MAX_TIME_MS, timeoutMS:MAX_TIME_MS})
      : collection.aggregate([...q.pipeline, {$limit:MAX_DOCS}], {maxTimeMS:MAX_TIME_MS, timeoutMS:MAX_TIME_MS, allowDiskUse:false});
    try {
      const rows: Document[] = [];
      for await (const row of cursor) { rows.push(row); if (rows.length === MAX_DOCS) break; }
      return JSON.parse(JSON.stringify(rows));
    } finally { await cursor.close(); }
  }
  async schema() {
    const samples = await this.execute({collection:'movies',query:{operation:'find',filter:{},limit:3},explanation:'Read three sample movie documents.'});
    if (!samples.length) throw new Error('sample_mflix.movies is empty. Load the Atlas sample dataset first.');
    const fields: Record<string, string[]> = {};
    function inspect(doc: JsonDoc, prefix = '', depth = 0) {
      if (depth > 4) return;
      for (const [key, value] of Object.entries(doc)) {
        const path = prefix + key;
        const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
        fields[path] = [...new Set([...(fields[path] ?? []),type])];
        if (value && typeof value === 'object' && !Array.isArray(value)) inspect(value as JsonDoc, `${path}.`, depth+1);
      }
    }
    samples.forEach(s => inspect(s));
    return {collection:'sample_mflix.movies', fields, samples, note:'Field types inferred from three sample documents; rare fields may be absent. Dates and ObjectIds are JSON strings.'};
  }
  close() { return this.client.close(); }
}

export type JsonDoc = Record<string, unknown>;
export type Query = { operation: 'find'; filter: JsonDoc; projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1>; limit: number } | { operation: 'aggregate'; pipeline: JsonDoc[] };
export interface Plan { collection: 'movies'; query: Query; explanation: string }
export interface Step { stage: string; detail: string; status: 'running' | 'complete' | 'error' | 'refused' }
export interface ChartSpec { type: 'bar' | 'line'; xKey: string; yKey: string; title: string }
export interface Answer { sessionId: string; mongoQuery: Plan | null; explanation: string; results: JsonDoc[]; steps: Step[]; chartSpec?: ChartSpec; error?: string; repaired: boolean; latencyMs: number }
export interface Metrics { total: number; successful: number; refused: number; failed: number; repairAttempts: number; healed: number; averageLatencyMs: number; repairRate: number; healingRate: number; series: { hour: string; queries: number }[] }

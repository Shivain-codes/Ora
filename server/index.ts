import express from 'express';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', buildStage: 'gate-1', databaseConnected: false }));
app.post('/api/query', (_req, res) => res.status(503).json({
  explanation: 'The query agent is not available yet. This build is awaiting the Gate 1 design review.',
  results: [], steps: [],
}));
app.listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () => console.log('AskMongo API: http://127.0.0.1:3001 (Gate 1 preview)'));

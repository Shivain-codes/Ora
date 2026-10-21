import { Console } from './components/console';
import React from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCheck, Code2, Copy, Database, Fingerprint, Layers3, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

const exampleQuery = `db.movies.find({\n  cast: "Tom Hanks",\n  year: { $gt: 2000 }\n}).limit(25)`;

function Brand() {
  return <a href="/" className="brand" aria-label="AskMongo home"><span className="brand-mark" aria-hidden="true"><Layers3 size={21} strokeWidth={1.7} /></span>askmongo<span className="brand-period">.</span></a>;
}

function Header() {
  return <header className="header shell"><Brand /><nav aria-label="Main navigation"><a className="nav-link" href="/#how-it-works">How it works</a><span className="nav-divider" /><Button asChild variant="outline"><a href="/console">Open console <ArrowUpRight size={15} /></a></Button></nav></header>;
}

function QueryPreview() {
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(exampleQuery); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <section id="query-preview" className="query-preview" aria-label="Illustrative query preview">
    <div className="preview-chrome"><span><Terminal size={14} /> A question becomes a query</span><span className="preview-label">Illustrative preview</span></div>
    <div className="prompt-example"><span className="prompt-symbol" aria-hidden="true"><Sparkles size={18} /></span><p>Movies starring Tom Hanks released after 2000</p><a href="/console?example=tom-hanks" aria-label="Open console with this example" className="prompt-submit"><ArrowRight size={19} /></a></div>
    <div className="preview-body">
      <div className="trace-preview">
        <div className="panel-label"><Fingerprint size={15} /><span>Every step, in the open</span></div>
        <ol className="trace-list">
          <li><span className="trace-check"><Check size={12} /></span><span>Read the schema<small>Understand fields and types</small></span></li>
          <li><span className="trace-check"><Check size={12} /></span><span>Write the query<small>Turn your question into MongoDB</small></span></li>
          <li><span className="trace-check"><ShieldCheck size={13} /></span><span>Check before running<small>Read operations only. Always.</small></span></li>
        </ol>
      </div>
      <div className="code-preview">
        <div className="code-heading"><span><Code2 size={15} /> MongoDB query</span><button aria-label="Copy example query" onClick={copy}>{copied ? <CheckCheck size={15} /> : <Copy size={15} />}</button></div>
        <pre aria-label="Example MongoDB query"><code><span className="syntax-muted">db.</span>movies.<span className="syntax-function">find</span>{'({\n'}{'  '}cast: <span className="syntax-string">"Tom Hanks"</span>{',\n'}{'  '}year: {'{ '}<span className="syntax-function">$gt</span>: <span className="syntax-number">2000</span>{' }\n'}{'})'}.<span className="syntax-function">limit</span>(<span className="syntax-number">25</span>)</code></pre>
        <div className="code-caption"><span><ShieldCheck size={13} /> Read-only query</span><span role="status">{copyError ? 'Select the query to copy' : copied ? 'Copied to clipboard' : '25 document limit'}</span></div>
      </div>
    </div>
    <div className="preview-footer"><span><Database size={13} /> Dataset: <strong>sample_mflix</strong></span><span>No database query has been run in this preview.</span></div>
  </section>;
}

function Landing() {
  return <><Header /><main>
    <section className="hero shell" aria-labelledby="hero-title">
      <div className="aurora" aria-hidden="true" />
      <div className="hero-kicker"><span className="signal-dot" /> A little language. A lot of insight.</div>
      <h1 id="hero-title">Ask your database<br />anything.</h1>
      <p className="hero-description">It writes the query, checks its own work,<br className="desktop-break" /> and charts the answer.</p>
      <div className="hero-actions"><Button asChild className="hero-cta"><a href="/console">Try the console <ArrowUpRight size={19} /></a></Button><a className="secondary-link" href="#query-preview">See what happens <ArrowDown size={15} /></a></div>
      <p className="hero-note"><ShieldCheck size={14} /> Built for curiosity. Designed to be read-only.</p>
      <QueryPreview />
    </section>
    <section className="principles shell" id="how-it-works" aria-label="How AskMongo works">
      <div className="principles-intro"><span className="section-label">From question to clarity</span><h2>Your curiosity.<br /> Its next move.</h2><p>A database analyst that shows its work.</p></div>
      <div className="principle"><span className="principle-icon"><Database size={20} /></span><h3>Starts with your data.</h3><p>Reads your schema before writing a query. Field names, types, and context included.</p></div>
      <div className="principle"><span className="principle-icon"><ShieldCheck size={20} /></span><h3>Checks its own work.</h3><p>Validates each query. If a result needs another look, it makes one repair attempt.</p></div>
      <div className="principle"><span className="principle-icon"><Sparkles size={20} /></span><h3>Keeps the thread.</h3><p>Ask “now only comedies.” Your next question picks up where the last one left off.</p></div>
    </section>
  </main><Footer /></>;
}

function Footer() { return <footer className="footer shell"><Brand /><span>Natural language. Transparent queries.</span><span>Built around MongoDB.</span></footer>; }

export default function App() { return window.location.pathname === '/console' ? <><Header /><Console /><Footer /></> : <Landing />; }

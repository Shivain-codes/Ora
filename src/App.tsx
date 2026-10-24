import { Console } from './components/console';
import { ArrowDown, ArrowRight, ArrowUpRight, Database, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlurFade } from './components/ui/blur-fade';

function Brand() {
  return <a href="/" className="brand" aria-label="AskMongo home"><Database size={22} strokeWidth={1.75} aria-hidden="true" /><span>askmongo<span className="brand-period">.</span></span></a>;
}

function Header() {
  return <header className="header shell"><Brand /><nav aria-label="Main navigation"><a className="nav-link" href="/#process">The process</a><a className="nav-link" href="/#questions">Questions</a><Button asChild><a href="/console">Open console <ArrowUpRight size={15} /></a></Button></nav></header>;
}

const EXAMPLES = [
  { n: "01", q: "Movies starring Tom Hanks released after 2000", href: "/console?example=tom-hanks" },
  { n: "02", q: "Top 5 highest rated comedies", href: "/console" },
  { n: "03", q: "Movies released per year", href: "/console" },
];

const PHASES = [
  {
    n: "01", name: "Read the schema", meta: "First, always",
    items: [
      { t: "Field names & types", d: "It learns what your data actually looks like before writing anything." },
      { t: "Context included", d: "Collection names, sample values, and relationships shape the query." },
    ],
  },
  {
    n: "02", name: "Write the query", meta: "From your words",
    items: [
      { t: "Natural language in", d: "Ask like you'd ask a person. No query syntax required." },
      { t: "MongoDB out", d: "A real, runnable query — shown to you, not hidden." },
    ],
  },
  {
    n: "03", name: "Check before running", meta: "Non-negotiable",
    items: [
      { t: "Read operations only", d: "Find and aggregate pass. Writes, drops, and $where never run." },
      { t: "One repair attempt", d: "If a result needs another look, it fixes its own query and retries once." },
    ],
  },
  {
    n: "04", name: "Chart the answer", meta: "So it lands",
    items: [
      { t: "Documents, explained", d: "Results come back with a plain-language explanation." },
      { t: "Charts where they help", d: "Counts over time, top lists, distributions — visual when it adds clarity." },
    ],
  },
];

const PLAYBOOK = [
  "Read-only. Always.",
  "Shows its work.",
  "Repairs its own mistakes.",
  "Charts the answer.",
  "Keeps the thread.",
];

const FAQS = [
  { q: "Can it change or delete my data?", a: "No. The safety validator only allows find and aggregate. Any write, drop, or dangerous operator is refused before it reaches the database." },
  { q: "Which data does it use?", a: "The sample_mflix dataset — a public MongoDB sample of movies. Your questions run against that collection, nothing else." },
  { q: "What happens when a query fails?", a: "It makes one repair attempt: re-reads the error, rewrites the query, and tries again. If that fails too, it says so plainly instead of guessing." },
  { q: "Do I need to know MongoDB?", a: "No. That's the point. You bring the question; it brings the query language." },
];

function Landing() {
  return <><Header /><main>
    <section className="statement shell" aria-labelledby="hero-title">
      <BlurFade><p className="statement-label">A read-only MongoDB analyst</p></BlurFade>
      <BlurFade delay={0.1}><h1 id="hero-title">You don't need to learn MongoDB.<br />You need <em>answers</em> from your data.</h1></BlurFade>
      <BlurFade delay={0.2}><p className="statement-sub">Ask a question in plain words. It writes the query, checks its own work, and charts the answer — in the open, every step visible.</p></BlurFade>
      <BlurFade delay={0.3}><div className="statement-actions"><Button asChild className="statement-cta"><a href="/console">Ask your first question <ArrowUpRight size={17} /></a></Button><a className="secondary-link" href="#process">See how it works <ArrowDown size={15} /></a></div></BlurFade>
    </section>

    <section className="questions shell" id="questions" aria-label="Questions that got answers">
      <div className="section-head"><span className="section-label">Questions that got answers</span></div>
      <div className="question-list">
        {EXAMPLES.map((e) => (
          <a key={e.n} href={e.href} className="question-row">
            <span className="question-num">{e.n}</span>
            <span className="question-text">{e.q}</span>
            <ArrowRight size={20} className="question-arrow" />
          </a>
        ))}
      </div>
    </section>

    <section className="process shell" id="process" aria-label="The process">
      <div className="section-head"><span className="section-label">The process</span><h2>This is how the answer gets made.</h2><p>Good answers start with a clear question. It reads, writes, checks, and charts — in that order, every time.</p></div>
      <div className="phase-list">
        {PHASES.map((p) => (
          <div key={p.n} className="phase">
            <div className="phase-head"><span className="phase-num">{p.n}</span><h3>{p.name}</h3><span className="phase-meta">{p.meta}</span></div>
            <div className="phase-items">
              {p.items.map((it) => (
                <div key={it.t} className="phase-item"><h4>{it.t}</h4><p>{it.d}</p></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="wordmark shell" aria-label="What AskMongo stands for">
      <div className="wordmark-giant">ASKMONGO<span className="brand-period">.</span></div>
      <ul className="playbook">
        {PLAYBOOK.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>

    <section className="faq shell" aria-label="Questions about AskMongo">
      <div className="section-head"><span className="section-label">Got questions?</span><h2>Fair ones, answered straight.</h2></div>
      <div className="faq-list">
        {FAQS.map((f) => (
          <details key={f.q} className="faq-item"><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
      </div>
    </section>

    <section className="final-cta shell" aria-label="Try AskMongo">
      <h2>Not a query person?<br />Good. That's who it's for.</h2>
      <Button asChild className="statement-cta"><a href="/console">Open the console <ArrowUpRight size={17} /></a></Button>
      <p><ShieldCheck size={14} /> Read-only by construction. Your data stays yours.</p>
    </section>
  </main><Footer /></>;
}

function Footer() { return <footer className="footer shell"><Brand /><span>Natural language. Transparent queries.</span><span>Built around MongoDB.</span></footer>; }

export default function App() { return window.location.pathname === '/console' ? <><Header /><Console /><Footer /></> : <Landing />; }

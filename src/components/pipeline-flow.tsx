import { forwardRef, useRef } from "react";
import { BarChart3, Code2, Database, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { AnimatedBeam } from "./ui/animated-beam";
import { cn } from "@/lib/utils";

const Node = forwardRef<HTMLDivElement, { className?: string; label: string; icon: React.ReactNode }>(
  ({ className, label, icon }, ref) => (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={ref}
        className={cn(
          "z-10 flex size-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]",
          className
        )}
      >
        {icon}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
    </div>
  )
);
Node.displayName = "Node";

/**
 * Ora's pipeline, visualised with Magic UI's AnimatedBeam: a question
 * flows through schema, query generation, safety validation, and lands
 * as an answer with a chart. This is the site's signature motion piece.
 */
export function PipelineFlow({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLDivElement>(null);
  const schemaRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLDivElement>(null);
  const safetyRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden py-10",
        className
      )}
    >
      <div className="flex w-full max-w-4xl items-start justify-between gap-2 px-4">
        <Node ref={qRef} label="Question" icon={<MessageCircleQuestion size={22} />} />
        <Node ref={schemaRef} label="Schema" icon={<Database size={22} />} />
        <Node ref={queryRef} label="Query" icon={<Code2 size={22} />} />
        <Node ref={safetyRef} label="Safety" icon={<ShieldCheck size={22} />} />
        <Node ref={answerRef} label="Answer" icon={<BarChart3 size={22} />} />
      </div>
      <AnimatedBeam containerRef={containerRef} fromRef={qRef} toRef={schemaRef} duration={3} />
      <AnimatedBeam containerRef={containerRef} fromRef={schemaRef} toRef={queryRef} duration={3} delay={0.6} />
      <AnimatedBeam containerRef={containerRef} fromRef={queryRef} toRef={safetyRef} duration={3} delay={1.2} />
      <AnimatedBeam containerRef={containerRef} fromRef={safetyRef} toRef={answerRef} duration={3} delay={1.8} />
    </div>
  );
}

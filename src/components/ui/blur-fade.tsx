import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number; opacity: number; filter: string };
    visible: { y: number; opacity: number; filter: string };
  };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
}

/**
 * Magic UI BlurFade: content fades in from a blur. The standard entrance
 * for Ora's hero and section reveals — calm, not bouncy.
 */
export function BlurFade({
  children,
  className,
  variant,
  duration = 0.7,
  delay = 0,
  yOffset = 10,
  inView = false,
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: "-40px" });
  const isInView = !inView || inViewResult;
  const reduce = useReducedMotion();
  const defaultVariants = {
    hidden: { y: reduce ? 0 : yOffset, opacity: 0, filter: "blur(6px)" },
    visible: { y: 0, opacity: 1, filter: "blur(0px)" },
  };
  const combinedVariants = variant || defaultVariants;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      exit="hidden"
      variants={combinedVariants}
      transition={{ delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

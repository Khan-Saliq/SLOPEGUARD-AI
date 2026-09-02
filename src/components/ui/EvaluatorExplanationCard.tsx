import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, Database, Target, BookOpen, Sparkles } from 'lucide-react';

export interface ComponentExplanationProps {
  title: string;
  purpose: string;
  inputs: string;
  psReference: string;
  evaluatorNote: string;
  defaultOpen?: boolean;
  className?: string;
}

export function EvaluatorExplanationCard({
  title,
  purpose,
  inputs,
  psReference,
  evaluatorNote,
  defaultOpen = true,
  className = '',
}: ComponentExplanationProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs backdrop-blur-xs transition-all ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between font-medium text-accent-bright hover:text-accent focus:outline-hidden"
      >
        <span className="flex items-center gap-1.5 font-semibold tracking-wide uppercase text-[11px]">
          <Info className="h-3.5 w-3.5 text-accent-bright shrink-0" />
          <span className="text-main">{title}</span>
          <span className="text-dim font-normal">— Evaluator Guide & Purpose</span>
        </span>
        <span className="flex items-center gap-1 text-[10px] text-accent/80">
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] text-accent-bright">
            {psReference}
          </span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 pt-2 border-t border-border/40 space-y-2 text-dim leading-relaxed">
              <div className="flex items-start gap-1.5">
                <Target className="h-3.5 w-3.5 text-accent-bright shrink-0 mt-0.5" />
                <div>
                  <strong className="text-main font-medium">Use & Purpose: </strong>
                  <span>{purpose}</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5">
                <Database className="h-3.5 w-3.5 text-accent-warm shrink-0 mt-0.5" />
                <div>
                  <strong className="text-main font-medium">Data Inputs / Used Components: </strong>
                  <span className="font-mono text-[11px] text-accent-warm">{inputs}</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-low shrink-0 mt-0.5" />
                <div>
                  <strong className="text-main font-medium">Evaluator Key Takeaway: </strong>
                  <span className="text-main/90 italic">{evaluatorNote}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EvaluatorHeaderBanner({
  pageTitle,
  description,
  isEvaluatorMode,
  onToggleEvaluatorMode,
}: {
  pageTitle: string;
  description: string;
  isEvaluatorMode: boolean;
  onToggleEvaluatorMode: () => void;
}) {
  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-card-hover/90 via-card/90 to-accent/10 p-4 shadow-md backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-main">{pageTitle}</h1>
            <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-accent-bright uppercase border border-accent/40 flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Evaluator Explanation Enabled
            </span>
          </div>
          <p className="text-sm text-dim mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleEvaluatorMode}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              isEvaluatorMode
                ? 'border-accent-bright bg-accent/20 text-accent-bright shadow-sm shadow-accent/20'
                : 'border-border bg-card text-dim hover:bg-card-hover hover:text-main'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isEvaluatorMode ? 'Hide Detailed Explanations' : 'Show Evaluator Explanations'}
          </button>
        </div>
      </div>
    </div>
  );
}

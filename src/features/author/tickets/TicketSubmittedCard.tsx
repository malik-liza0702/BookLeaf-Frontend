import { useEffect, useRef } from 'react';

function AnimatedTick() {
  return (
    <span className="relative block h-16 w-16" aria-hidden>
      <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-0 motion-safe:animate-tick-ripple" />
      <svg viewBox="0 0 64 64" className="relative h-full w-full overflow-visible">
        <circle
          cx="32"
          cy="32"
          r="32"
          className="origin-center fill-emerald-600 [transform-box:fill-box] motion-safe:animate-tick-disc"
        />
        <path
          d="M19 33.5 28 42.5 45.5 23.5"
          pathLength={1}
          strokeDasharray="1 1"
          className="fill-none stroke-white motion-safe:animate-tick-draw"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function TicketSubmittedCard({ ticketNumber }: { ticketNumber: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="mb-5 flex flex-col items-center overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-8 text-center outline-none"
    >
      <AnimatedTick />
      <div className="mt-4 motion-safe:animate-rise-in">
        <p className="text-lg font-semibold text-emerald-900">Query submitted</p>
        <p className="mt-1 text-sm text-emerald-800">
          Your ticket number is <strong className="font-mono font-semibold">{ticketNumber}</strong>. Our support team
          will reply here, and this page updates automatically.
        </p>
      </div>
    </div>
  );
}

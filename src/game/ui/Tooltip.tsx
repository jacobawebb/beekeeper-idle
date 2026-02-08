"use client";

import { useId, useMemo, useState } from "react";

type TooltipProps = {
  label: string;
  description: string;
  rate?: string;
  source?: string;
  children: React.ReactNode;
};

export default function Tooltip({
  label,
  description,
  rate,
  source,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hint = useMemo(() => {
    if (!open) return null;
    return (
      <div
        className="tooltip left-1/2 top-full mt-2 -translate-x-1/2"
        role="tooltip"
        id={id}
      >
        <div className="tooltip-title">{label}</div>
        <div>{description}</div>
        {source ? <div className="mt-2">Source: {source}</div> : null}
        {rate ? <div className="mt-1">Rate: {rate}</div> : null}
      </div>
    );
  }, [description, id, label, open, rate, source]);

  return (
    <button
      type="button"
      className="relative inline-flex items-center gap-1"
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((value) => !value)}
    >
      {children}
      {hint}
    </button>
  );
}

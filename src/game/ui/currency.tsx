"use client";

export type CurrencyKey = "honey" | "wax" | "royalJelly" | "researchPoints";

export const CURRENCY_PALETTE: Record<
  CurrencyKey,
  { label: string; short: string; color: string; soft: string }
> = {
  honey: {
    label: "Honey",
    short: "HNY",
    color: "#c07a1a",
    soft: "#f6e2b8",
  },
  wax: {
    label: "Wax",
    short: "WAX",
    color: "#a6853b",
    soft: "#efe1c3",
  },
  royalJelly: {
    label: "Royal Jelly",
    short: "RJ",
    color: "#b04b7a",
    soft: "#f2d0e2",
  },
  researchPoints: {
    label: "Research",
    short: "RP",
    color: "#3c7d8b",
    soft: "#cde7ec",
  },
};

export function CurrencyIcon({
  currency,
  size = 14,
}: {
  currency: CurrencyKey;
  size?: number;
}) {
  const palette = CURRENCY_PALETTE[currency];
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: palette.color,
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  switch (currency) {
    case "honey":
      return (
        <svg {...commonProps}>
          <path d="M12 3c2.8 2.7 5 5.4 5 8.2a5 5 0 1 1-10 0C7 8.4 9.2 5.7 12 3Z" />
        </svg>
      );
    case "wax":
      return (
        <svg {...commonProps}>
          <path d="M7 4h10l4 8-4 8H7L3 12l4-8Z" />
        </svg>
      );
    case "royalJelly":
      return (
        <svg {...commonProps}>
          <path d="m12 4 2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7L12 4Z" />
        </svg>
      );
    case "researchPoints":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          <path d="m5 5 2.5 2.5M16.5 16.5 19 19M5 19l2.5-2.5M16.5 7.5 19 5" />
        </svg>
      );
    default:
      return null;
  }
}

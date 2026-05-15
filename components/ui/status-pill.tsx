import { cn } from "@/lib/utils";

const toneClasses = {
  neutral: "bg-muted text-muted-foreground",
  good: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  bad: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
} as const;

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof toneClasses;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

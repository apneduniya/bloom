export function StatusPill({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad"; children: React.ReactNode }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

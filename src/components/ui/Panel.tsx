interface PanelProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Panel({ title, action, children, className = "", id }: PanelProps) {
  return (
    <section id={id} className={`rounded-lg border border-zinc-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          {title ? <h2 className="text-sm font-semibold text-zinc-950">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

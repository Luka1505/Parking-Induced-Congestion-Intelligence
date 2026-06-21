interface EmptyStateProps {
  title: string;
  children?: React.ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
      <div className="text-sm font-semibold text-zinc-800">{title}</div>
      {children ? <div className="mt-2 max-w-md text-sm text-zinc-500">{children}</div> : null}
    </div>
  );
}

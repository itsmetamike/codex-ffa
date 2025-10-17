interface PageHeaderProps {
  stepNumber: number;
  title: string;
  description: string;
}

export function PageHeader({ stepNumber, title, description }: PageHeaderProps) {
  return (
    <header className="space-y-2">
      <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Step {stepNumber}</p>
      <h1 className="text-3xl font-semibold text-slate-100">{title}</h1>
      <p className="text-slate-300">{description}</p>
    </header>
  );
}

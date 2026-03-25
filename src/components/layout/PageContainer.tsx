interface Props {
  title: string;
  subtitle?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}

export function PageContainer({ title, subtitle, wide, children }: Props) {
  return (
    <div className={`${wide ? "max-w-6xl" : "max-w-5xl"} mx-auto px-4 py-8`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

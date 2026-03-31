import { DEFAULT_PAGE_CONTAINER_CLASS } from "./container";

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

export function PageContainer({ title, subtitle, children }: Props) {
  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-8`}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

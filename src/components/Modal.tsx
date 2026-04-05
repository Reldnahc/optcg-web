import type { CSSProperties, ReactNode } from "react";

export function ModalBackdrop({
  children,
  onClose,
  paddingClassName = "p-3 sm:p-6",
}: {
  children: ReactNode;
  onClose: () => void;
  paddingClassName?: string;
}) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/72 ${paddingClassName}`} onClick={onClose}>
      {children}
    </div>
  );
}

export function ModalSurface({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/80 bg-[#111318] shadow-[0_32px_120px_rgba(0,0,0,0.55)] ${className}`.trim()}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function ModalCloseButton({
  onClose,
  className = "",
  style,
}: {
  onClose: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close modal"
      style={style}
      className={`absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border/70 bg-bg-input/70 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary ${className}`.trim()}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
  );
}

type ModalAction = {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "primary";
  icon?: ReactNode;
};

export function ActionModal({
  onClose,
  eyebrow,
  title,
  description,
  actions,
  children,
  maxWidthClassName = "max-w-md",
}: {
  onClose: () => void;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions: ModalAction[];
  children?: ReactNode;
  maxWidthClassName?: string;
}) {
  return (
    <ModalBackdrop onClose={onClose}>
      <ModalSurface
        className={`w-full ${maxWidthClassName} p-4 sm:p-5`}
        onClick={(event) => event.stopPropagation()}
      >
        <ModalCloseButton onClose={onClose} />
        <div className="space-y-2">
          {eyebrow ? <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{eyebrow}</p> : null}
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {description ? <div className="text-sm text-text-secondary">{description}</div> : null}
          {children}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {actions.map((action) => {
            const toneClass = action.tone === "danger"
              ? "border-banned/40 bg-banned/12 text-banned hover:bg-banned/20"
              : action.tone === "primary"
                ? "border-accent/55 bg-accent/16 text-text-primary hover:bg-accent/24"
                : "border-border/70 bg-bg-input/70 text-text-primary hover:bg-bg-hover";

            return (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${toneClass}`}
              >
                {action.icon}
                {action.label}
              </button>
            );
          })}
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}

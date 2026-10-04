import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
    </label>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function PageHead({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Message({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "error" | "success";
}) {
  const text = typeof children === "string" ? children : null;
  const detail =
    tone === "error" && text
      ? /failed to fetch|network|fetch failed/i.test(text)
        ? "Could not connect. Check your connection and try again."
        : /jwt expired|invalid jwt|not authenticated/i.test(text)
          ? "Your session has expired. Sign in again to continue."
          : text
      : children;
  return (
    <div
      className={`message message-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {detail}
    </div>
  );
}
export function Loading({ label = "Loading your space…" }: { label?: string }) {
  return (
    <div className="loading-skeleton" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="skeleton skeleton-heading" />
      <div className="skeleton skeleton-copy" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-row" />
      <div className="skeleton skeleton-row" />
    </div>
  );
}
export function FlowSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = ["Define", "Habits", "Review", "Commit"];
  return (
    <nav className="flow-steps" aria-label="Challenge creation progress">
      {steps.map((label, index) => {
        const number = index + 1;
        return (
          <span
            key={label}
            className={`flow-step ${number === current ? "active" : number < current ? "complete" : ""}`}
            aria-current={number === current ? "step" : undefined}
          >
            <strong>{String(number).padStart(2, "0")}</strong>
            <span>{label}</span>
          </span>
        );
      })}
    </nav>
  );
}
export function Empty({
  title,
  children,
  action,
  variant = "standard",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  variant?: "standard" | "journey";
}) {
  return (
    <Panel className={`empty ${variant === "journey" ? "empty-journey" : ""}`}>
      {variant === "journey" ? (
        <div className="empty-illustration" aria-hidden="true">
          {Array.from({ length: 21 }, (_, index) => <span key={index} />)}
        </div>
      ) : (
        <div className="empty-mark" aria-hidden="true">↗</div>
      )}
      <h2>{title}</h2>
      <div className="empty-body">{children}</div>
      {action}
    </Panel>
  );
}

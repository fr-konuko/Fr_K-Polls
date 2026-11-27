import type { ReactNode } from "react";

export function PageIntro({ section, title, description, children }: {
  section: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <div>
        <p className="eyebrow">{section}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {children && <div className="page-intro-action">{children}</div>}
    </header>
  );
}

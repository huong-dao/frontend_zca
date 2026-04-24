import React from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <div className="mb-8 flex min-w-0 max-w-full flex-col gap-4 items-start justify-between md:flex-row md:flex-wrap md:items-end">
    <div className="min-w-0 max-w-full flex-1">
      <h2 className="mb-1 text-2xl font-bold tracking-tight text-on-surface">{title}</h2>
      <p className="body-md text-sm text-on-surface-variant break-words">{description}</p>
    </div>
    <div className="flex shrink-0 flex-wrap gap-3">{actions ?? null}</div>
  </div>
);

export default PageHeader;
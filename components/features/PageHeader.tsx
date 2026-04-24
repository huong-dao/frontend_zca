import React from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <div className="flex flex-col md:flex-row md:flex-wrap justify-between items-start md:items-end mb-8 gap-4">
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-on-surface mb-1">{title}</h2>
      <p className="text-on-surface-variant body-md text-sm">{description}</p>
    </div>
    <div className="flex gap-3">{actions ?? null}</div>
  </div>
);

export default PageHeader;
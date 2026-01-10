import React from "react";

interface SectionCardProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({
  title,
  icon,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        bg-white/5
        backdrop-blur-sm
        h-50 md:h-64
        ${className}
      `}
    >
      <div className="p-4 md:p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-xl">{icon}</span>}
          <h2 className="font-semibold text-base md:text-lg">{title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

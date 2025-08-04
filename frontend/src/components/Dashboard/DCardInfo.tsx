import React from "react";

interface DCardInfoProps {
  title: string
  message?: string
  CustomComponent: React.ComponentType;
}

export default function DCardInfo ({ title, CustomComponent}: DCardInfoProps) {
  return (
    <div className="bg-white/50 dark:bg-black/50 grid grid-rows-6 rounded-lg shadow p-6">
        <h2 className="text-lg row-span-1">{title}</h2>
        <div className="row-span-5">
          <CustomComponent />
        </div>
    </div>
  );
}

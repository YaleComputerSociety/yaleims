import React from "react";
import Link from "next/link";

interface DCardInfoProps {
  title: string
  link?: string
  message?: string
  CustomComponent: React.ComponentType;
}

export default function DCardInfo ({ title, CustomComponent}: DCardInfoProps) {
  return (
    <div className="bg-white/50 dark:bg-black/50 rounded-lg shadow p-6 flex flex-col h-full">
        <h2 className="text-sm md:text-lg font-semibold">{title}</h2>
        <div className="mt-auto">
          <CustomComponent />
        </div>
    </div>
  );
}

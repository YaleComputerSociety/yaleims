import React from "react";
import Link from "next/link";

interface DCardInfoProps {
  title: string
  link?: string
  message?: string
}

export default function DCardInfo ({ title, link, message}: DCardInfoProps) {
  return (
    <div className="bg-white/50 dark:bg-black/50 grid grid-rows-6 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold row-span-1">{title}</h2>
        <div className="row-span-5">
          <CustomComponent />
        </div>
        {link && (
            <Link
                href={link}
                className="mt-auto flex justify-between text-xs text-gray-500"
            >
                Click to update scores
            </Link>
        )}
    </div>
  );
}

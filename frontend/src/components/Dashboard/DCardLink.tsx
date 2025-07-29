import React from "react";
import Link from "next/link";

interface DCardLinkProps {
  title: string;
  link?: string;
  message?: string;
}

export default function DCardLink({ title, link, message }: DCardLinkProps) {
  return (
    <div
      className="bg-white/50 dark:bg-black/50 rounded-lg p-7 shadow-md grid grid-rows-7"
    >
      <h2 className="text-lg font-semibold row-span-1">{title}</h2>
      <div className="mt-4 row-span-5 ">{message}</div>
      {link && (
        <Link
          href={link}
          className="row-span-1 inline-block text-xs text-indigo-600 hover:underline"
        >
          Click to update scores →
        </Link>
      )}
    </div>
  );
}

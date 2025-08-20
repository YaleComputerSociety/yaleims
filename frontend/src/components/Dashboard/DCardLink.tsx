import React from "react";
import Link from "next/link";

interface DCardLinkProps {
  title: string;
  link?: string;
  message?: string;
  openLinkInfo: string;
}

export default function DCardLink({ title, link, message, openLinkInfo }: DCardLinkProps) {
  return (
    <div
      className="bg-white/50 dark:bg-black/50 rounded-lg p-7 shadow-md grid grid-rows-5"
    >
      <h2 className="text-base md:text-lg font-semibold row-span-1">{title}</h2>
      <div className="mt-2 md:mt-4 text-xs xs:text-sm row-span-3 ">{message}</div>
      {link && (
        <Link
          href={link}
          className="row-span-1 pt-2 text-xs text-indigo-600 hover:underline"
        >
          {openLinkInfo}
        </Link>
      )}
    </div>
  );
}

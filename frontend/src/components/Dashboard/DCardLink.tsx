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
      className="bg-white/50 dark:bg-black/50 rounded-lg p-7 shadow-md h-full flex flex-col"
    >
      <h2 className="text-base md:text-lg font-semibold ">{title}</h2>
      <div className="mt-2 md:mt-4 text-xs md:text-sm">{message}</div>
      {link && (
        <Link
          href={link}
          className="mt-auto pt-2 text-xs text-indigo-600 hover:underline"
        >
          {openLinkInfo}
        </Link>
      )}
    </div>
  );
}

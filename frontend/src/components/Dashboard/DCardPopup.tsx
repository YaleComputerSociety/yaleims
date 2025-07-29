import React from "react";
import Link from "next/link";

interface DCardPopupProps {
  title: string
  link?: string
  message?: string
}

export default function DCardPopup ({ title, link, message}: DCardPopupProps) {
  return (
    <div className="w-96 h-56 dark:bg-black bg-white rounded-lg shadow p-6">
        <h2 className="text-lg text-white">{title}</h2>
        <div className="mt-4">
            {message}
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

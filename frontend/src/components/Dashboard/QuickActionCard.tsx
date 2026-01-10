import React from "react";
import Link from "next/link";

interface QuickActionCardProps {
  title: string;
  link: string;
  icon: string;
  description?: string;
  gradient?: string;
}

export default function QuickActionCard({
  title,
  link,
  icon,
  description,
  gradient = "from-indigo-500/10 to-purple-500/10",
}: QuickActionCardProps) {
  return (
    <Link href={link} className="group">
      <div
        className={`
          relative overflow-hidden rounded-xl p-4 md:p-5
          bg-gradient-to-br ${gradient}
          backdrop-blur-sm
          transition-all duration-300
          hover:scale-[1.02]
          hover:shadow-lg hover:shadow-indigo-500/10
          h-full flex flex-col
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <span className="text-2xl md:text-3xl">{icon}</span>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
        <h3 className="font-semibold text-sm md:text-base mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-gray-400 line-clamp-2">{description}</p>
        )}
        {/* Decorative element */}
        <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-white/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

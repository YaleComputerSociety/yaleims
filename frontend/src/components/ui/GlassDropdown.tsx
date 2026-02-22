"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { FaChevronDown, FaCheck } from "react-icons/fa";

export interface GlassDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface GlassDropdownProps {
  /** Text shown when nothing is selected (or as the "reset" option) */
  placeholder: string;
  value: string;
  options: GlassDropdownOption[];
  onChange: (v: string) => void;
  /** If true, the first option resets to "" (shows placeholder). Default true. */
  allowReset?: boolean;
  /** Extra classes on the trigger button */
  className?: string;
}

const GlassDropdown: React.FC<GlassDropdownProps> = ({
  placeholder,
  value,
  options,
  onChange,
  allowReset = true,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const isActive = !!value;

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs font-semibold rounded-full border backdrop-blur-md transition-all duration-200 cursor-pointer
          ${
            isActive
              ? "bg-blue-600/90 text-white border-blue-500/60 shadow-lg shadow-blue-500/20"
              : "bg-gray-100/80 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-300/60 dark:border-white/10 hover:bg-gray-200/80 dark:hover:bg-white/10 hover:border-gray-400/50 dark:hover:border-white/30"
          }`}
      >
        <span className="truncate max-w-[10rem]">
          {selected ? (
            <span className="flex items-center gap-1.5">
              {selected.icon}
              {selected.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <FaChevronDown
          size={8}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""} ${isActive ? "text-white/70" : "text-gray-400"}`}
        />
      </button>

      {/* panel */}
      {open && (
        <div
          className="absolute z-50 mt-2 min-w-[12rem] max-h-72 overflow-y-auto rounded-xl border shadow-2xl ring-1 scrollbar-thin scrollbar-thumb-gray-400/30"
          style={isDark
            ? { background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }
            : { background: 'rgba(255, 255, 255, 0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderColor: 'rgba(209,213,219,0.8)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }
          }
        >
          {/* reset / "All" option */}
          {allowReset && (
            <>
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition-colors
                  ${!value
                    ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
              >
                <span>{placeholder}</span>
                {!value && <FaCheck size={9} className="text-blue-500" />}
              </button>
              <div className="mx-2.5 border-t border-gray-200 dark:border-white/10" />
            </>
          )}

          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition-colors
                ${value === opt.value
                  ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                }`}
            >
              <span className="flex items-center gap-1.5">
                {opt.icon}
                {opt.label}
              </span>
              {value === opt.value && <FaCheck size={9} className="text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlassDropdown;

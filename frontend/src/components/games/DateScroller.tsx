"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface DateScrollerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  /** Earliest date to show in the strip. Defaults to 30 days before today. */
  minDate?: Date;
  /** Latest date to show in the strip. Defaults to 30 days after today. */
  maxDate?: Date;
  /**
   * Set of "YYYY-MM-DD" strings for dates that have games.
   * These dates get a colored dot indicator.
   */
  highlightedDates?: Set<string>;
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildDateRange(minDate: Date, maxDate: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(minDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(maxDate);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DateScroller: React.FC<DateScrollerProps> = ({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  highlightedDates,
}) => {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const resolvedMin = useMemo(() => {
    if (minDate) return minDate;
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return d;
  }, [minDate, today]);

  const resolvedMax = useMemo(() => {
    if (maxDate) return maxDate;
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return d;
  }, [maxDate, today]);

  const dates = useMemo(
    () => buildDateRange(resolvedMin, resolvedMax),
    [resolvedMin, resolvedMax]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Centre the selected date in the strip
  useEffect(() => {
    if (!selectedRef.current || !scrollRef.current) return;
    const container = scrollRef.current;
    const btn = selectedRef.current;
    container.scrollTo({
      left: btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [selectedDate]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center w-full">
      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        className="flex-none z-10 p-2 rounded-full bg-gray-200 dark:bg-gray-900 shadow border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="Scroll left"
      >
        <FaChevronLeft size={12} />
      </button>

      {/* Scrollable date strip */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto scroll-smooth mx-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex gap-1.5 py-1 px-1 min-w-max">
          {dates.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const ymd = toYMD(date);
            const hasGames = highlightedDates ? highlightedDates.has(ymd) : false;

            return (
              <button
                key={i}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => onDateSelect(date)}
                className={`flex flex-col items-center justify-center w-14 h-16 rounded-xl text-xs font-medium transition-all duration-150 border flex-none
                  ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                      : isToday
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      : hasGames
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
                      : "bg-gray-200/60 dark:bg-gray-900/60 text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-800 hover:bg-gray-300/60 dark:hover:bg-gray-700/50"
                  }`}
              >
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    isSelected
                      ? "text-blue-100"
                      : isToday
                      ? "text-blue-400 dark:text-blue-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {DAYS[date.getDay()]}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {date.getDate()}
                </span>
                <span
                  className={`text-[10px] ${
                    isSelected ? "text-blue-100" : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {MONTHS[date.getMonth()]} {date.getFullYear()}
                </span>
                {/* Indicator dot: today (blue) or has-games (yellow) */}
                {(isToday || hasGames) && !isSelected ? (
                  <span
                    className={`w-2 h-2 rounded-full mt-0.5 ${
                      isToday ? "bg-blue-500" : "bg-yellow-400"
                    }`}
                  />
                ) : (
                  <span className="w-2 h-2 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        className="flex-none z-10 p-2 rounded-full bg-gray-200 dark:bg-gray-900 shadow border border-gray-300 dark:border-gray-700 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="Scroll right"
      >
        <FaChevronRight size={12} />
      </button>
    </div>
  );
};

export default DateScroller;

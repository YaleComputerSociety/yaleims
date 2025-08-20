import React, { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  addDays,
  subMonths,
  addMonths,
  format,
} from "date-fns";

type MyCalendarProps = {
  onClickDay: (value: Date) => void;
  selectedDate: Date;
  setSelectedDate: (value: Date) => void;
};

const Calendar: React.FC<MyCalendarProps> = ({
  onClickDay,
  selectedDate,
  setSelectedDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Start and end dates for the current month
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  // Day of the week for the first and last days of the current month
  const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const endDayOfWeek = endDate.getDay();

  // Generate days for the current month
  const daysInMonth = [];
  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    daysInMonth.push(day);
  }

  // Add placeholders for the previous month
  const prevMonthDays = [];
  const prevMonthEnd = subMonths(startDate, 1);
  const prevMonthLastDay = endOfMonth(prevMonthEnd);

  for (let i = 0; i < startDayOfWeek; i++) {
    prevMonthDays.unshift(addDays(prevMonthLastDay, -i));
  }

  // Add placeholders for the next month
  const nextMonthDays = [];
  const daysToAdd = 6 - endDayOfWeek;
  for (let i = 1; i <= daysToAdd; i++) {
    nextMonthDays.push(addDays(endDate, i));
  }

  // Combine all days for the calendar grid
  const allDays = [...prevMonthDays, ...daysInMonth, ...nextMonthDays];

  // Handle day click
  const handleClickDay = (day: Date) => {
    if (day < startDate || day > endDate) return; // Prevent clicks on placeholder days
    setSelectedDate(day);
    onClickDay(day);
  };

  // Change month handlers
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="p-6 bg-white dark:bg-black rounded-lg shadow-md max-w-full h-full mx-auto transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={prevMonth}
          className="text-blue-500 text-sm xs:text-lg"
        >
          &lt; Prev
        </button>
        <h2 className="text-sm xs:text-xl font-bold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <button
          onClick={nextMonth}
          className="text-blue-500 text-sm xs:text-lg"
        >
          Next &gt;
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-bold text-sm xs:text-lg">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {allDays.map((day, index) => (
          <div
            key={index}
            onClick={() => handleClickDay(day)}
            className={`text-center aspect-square flex items-center justify-center rounded-full cursor-pointer text-sm xs:text-lg ${
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                ? "bg-blue-500 text-white" // Highlight today's date
                : selectedDate &&
                  format(day, "yyyy-MM-dd") ===
                    format(selectedDate, "yyyy-MM-dd")
                ? "bg-blue-200 text-black" // Highlight selected date
                : day < startDate || day > endDate
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed" // Placeholder days
                : "hover:bg-gray-100 hover:text-black"
            }`}
          >
            {format(day, "d")}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;

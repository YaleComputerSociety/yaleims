import React, { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  addDays,
  format,
  addMonths,
  subMonths,
} from "date-fns";

type MyCalendarProps = {
  onClickDay: (value: Date) => void; // Function type: accepts a Date and returns void
};

const Calendar: React.FC<MyCalendarProps> = ({ onClickDay }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date()); // Automatically select today

  // Get start and end dates for the current month
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  // Generate days for the calendar
  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const handleClickDay = (day: Date) => {
    setSelectedDate(day);
    onClickDay(day);
  };

  // Change month
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="p-6 bg-white dark:bg-black rounded-lg shadow-md w-[500px] max-w-full mx-auto aspect-square pt-10">
      {/* Header with Month Navigation */}
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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {/* Weekday Labels */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-bold text-sm xs:text-lg">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            onClick={() => handleClickDay(day)}
            className={`text-center aspect-square flex items-center justify-center rounded-full cursor-pointer text-sm xs:text-lg ${
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                ? "bg-blue-500 text-white" // Highlight today's date
                : selectedDate &&
                  format(day, "yyyy-MM-dd") ===
                    format(selectedDate, "yyyy-MM-dd")
                ? "bg-blue-200 text-black" // Highlight selected date
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

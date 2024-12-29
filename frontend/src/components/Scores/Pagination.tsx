import React, { useEffect, useState } from "react";
import { PaginationProps } from "@src/types/components";

const Pagination: React.FC<PaginationProps> = ({
  currentPageNumber,
  totalPages,
  setPageNumber,
  setQueryType,
}) => {
  const [pages, setPages] = useState<number[]>([]);

  // set state array of page buttons to display
  useEffect(() => {
    const arr = [];
    for (let i = currentPageNumber - 1; i <= currentPageNumber + 1; i++) {
      if (i > 1 && i < totalPages) {
        arr.push(i);
      }
    }
    setPages(arr);
  }, [currentPageNumber, totalPages]);

  const handlePrevClick = () => {
    if (currentPageNumber === 1) return;
    setPageNumber(currentPageNumber - 1);
    setQueryType("prev");
  };

  const handleNextClick = () => {
    if (currentPageNumber === totalPages) return;
    setPageNumber(currentPageNumber + 1);
    setQueryType("next");
  };

  const handleIndexClick = (index: number) => {
    if (index === currentPageNumber) return;

    if (index === currentPageNumber + 1) {
      handleNextClick();
      return;
    }

    if (index === currentPageNumber - 1) {
      handlePrevClick();
      return;
    }

    setPageNumber(index);
    setQueryType("index");
  };

  return (
    <div className="flex flex-row items-center justify-center mt-4 gap-1">
      <button
        onClick={handlePrevClick}
        disabled={currentPageNumber === 1}
        className={`flex flex-row items-center justify-center px-2 py-1 rounded-lg bg-white text-black `}
      >
        {"<prev"}
      </button>

      <button
        onClick={() => handleIndexClick(1)}
        className={`${
          currentPageNumber === 1
            ? "bg-blue-500 text-white"
            : "bg-white text-black"
        } flex flex-row items-center justify-center px-2 py-1 rounded-lg `}
      >
        1
      </button>

      {currentPageNumber > 3 && <div>...</div>}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => handleIndexClick(page)}
          className={`${
            currentPageNumber === page
              ? "bg-blue-500 text-white"
              : "bg-white text-black"
          } flex flex-row items-center justify-center px-2 py-1 rounded-lg `}
        >
          {page}
        </button>
      ))}

      {currentPageNumber < totalPages - 2 && <div>...</div>}

      <button
        onClick={() => handleIndexClick(totalPages)}
        className={`${
          currentPageNumber === totalPages
            ? "bg-blue-500 text-white"
            : "bg-white text-black"
        } flex flex-row items-center justify-center px-2 py-1 rounded-lg ${
          totalPages === 1 ? "hidden" : ""
        }`}
      >
        {totalPages}
      </button>

      <button
        onClick={handleNextClick}
        disabled={currentPageNumber === totalPages}
        className="flex flex-row items-center justify-center px-2 py-1 rounded-lg bg-white text-black "
      >
        {"next>"}
      </button>
    </div>
  );
};

export default Pagination;

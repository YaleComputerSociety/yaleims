import React from "react";

type TitleProps = {
  selected: string;
  lastUpdated: string,
  onFilterChange: (filter: string) => void;
};

const Title: React.FC<TitleProps> = ({ selected, lastUpdated, onFilterChange }) => {
  const handleSelectionChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    onFilterChange(event.target.value);
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:max-w-[80%] sm:max-w-[75%] max-w-[85%] mx-auto pt-7 mb-7 xs:mb-0">
        <h1 className="hidden xs:block text-start ml-3 md:text-5xl text-4xl text-blue-600 font-bold dark:text-white mg:text-6xl relative">
          {selected === "2024-2025" && "TYNG CUP STANDINGS"}
          {selected === "All Time" && "ALL-TIME STANDINGS"}
          {selected === "Prediction" && "PREDICTION STANDINGS"}
        </h1>
        <div className="hidden xs:grid text-right grid-cols-2">
          <div>
            <p className="mg:text-sm xs:text-xs text-left pt-2 text-blue-600 underline">Last Updated: {lastUpdated}</p>
          </div>
          <div>
            <select
              value={selected}
              onChange={handleSelectionChange}
              className="focus:outline-none dark:bg-black border-solid border-2 md:p-2 p-1 border-blue-600 md:rounded-2xl rounded-xl text-blue-600 mg:text-sm xs:text-xs font-bold text-[10px]"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="Prediction">Predictionnssssssssss</option>
              <option value="All Time">All Time</option>
            </select>
            <p className="mg:pt-5 pt-3 text-blue-600 underline mg:text-sm xs:text-xs text-[10px]">
              Every point, every game
            </p>
            <p className="text-blue-600 underline mg:text-sm xs:text-xs text-[10px]">
              every play matters.
            </p>
          </div>
        </div>
      </div>
      <div className="xs:hidden text-blue-700 dark:text-white -mt-8">
        <h1 className="text-center font-bold text-2xl">
          {selected === "2024-2025" && "TYNG CUP STANDINGS"}
          {selected === "All Time" && "ALL-TIME STANDINGS"}
          {selected === "Prediction" && "PREDICTION STANDINGS"}
        </h1>
        <div className="flex flex-row justify-between w-3/4 mx-auto items-center">
          <select
            value={selected}
            onChange={handleSelectionChange}
            className="focus:outline-none dark:bg-black border-solid border-2 p-1 border-blue-600 rounded-lg text-sm font-bold text-blue-700"
          >
            <option value="2024-2025">2024-2025</option>
            <option value="Prediction">Prediction</option>
            <option value="All Time">All Time</option>
          </select>
          <h2 className="mt-4 text-right text-xs font-extralight underline mb-4 ">
            Every point, every game, <br /> every play matters.
          </h2>
        </div>
        <br></br>
      </div>
    </div>
  );
};

export default Title;

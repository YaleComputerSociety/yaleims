import React from "react";
import { useSeason } from "@src/context/SeasonContext";
import MVPPopup from "./MVPPopup";

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

  const [ day, month, year ] = lastUpdated.split('-');
  const convertedDate = `${month}/${day}/${year}`

  const { currentSeason, pastSeasons } = useSeason();

  return (
    <div className="relative pt-7 mb-7">
      <div className="grid grid-cols-2 md:max-w-[80%] sm:max-w-[75%] max-w-[85%] mx-auto pt-7 mb-7 xs:mb-0">
        <h1 className="hidden xs:block text-start ml-3 md:text-5xl text-4xl text-blue-600 font-bold dark:text-white mg:text-6xl relative">
          {selected === currentSeason?.year && "TYNG CUP STANDINGS"}
          {selected === "All Time" && "ALL-TIME STANDINGS"}
          {pastSeasons?.years?.includes(selected) && `${selected} STANDINGS`}
        </h1>
        <div className="hidden xs:grid text-right ml-10 grid-cols-2">
          <div>
            <MVPPopup />
          </div>
          <div>
            <select
              value={selected}
              onChange={handleSelectionChange}
              className="focus:outline-none dark:bg-black border-solid border-2 md:p-2 p-1 border-blue-600 md:rounded-2xl rounded-xl text-blue-600 mg:text-sm xs:text-xs font-bold text-[10px]"
            >
              <option value={currentSeason?.year}>{currentSeason?.year}</option>
              {pastSeasons?.years.map((season) => (
                <option key={season} value={season}>{season}</option>
              ))}
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
          {selected === currentSeason?.year && "TYNG CUP STANDINGS"}
          {selected === "All Time" && "ALL-TIME STANDINGS"}
          {pastSeasons?.years && selected in pastSeasons.years && `${selected} STANDINGS`}
        </h1>
        <div className="flex flex-row justify-between w-3/4 mx-auto items-center">
          <select
            value={selected}
            onChange={handleSelectionChange}
            className="focus:outline-none dark:bg-black border-solid border-2 p-1 border-blue-600 rounded-lg text-sm font-bold text-blue-700"
          >
            <option value={currentSeason?.year}>{currentSeason?.year}</option>
            {pastSeasons?.years.map((season) => (
              <option key={season} value={season}>{season}</option>
            ))}
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

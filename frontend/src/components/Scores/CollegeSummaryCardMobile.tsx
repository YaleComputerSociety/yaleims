import Skeleton from "react-loading-skeleton";
import Image from "next/image";
import { CollegeSummaryCardProps } from "@src/types/components";

import { getPlace, getRatioAsString } from "@src/utils/helpers";

const CollegeSummaryCardMobile: React.FC<CollegeSummaryCardProps> = ({
  stats,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex-col items-center h-60 p-8 md:mx-20 md:px-20 mb-4 py-10 bg-white dark:bg-black rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <Skeleton circle={true} height={64} width={64} />
          <div className="pr-4 flex flex-col justify-between h-full">
            <Skeleton height={24} width={150} />
            <Skeleton height={20} width={100} />
          </div>
        </div>
        <div className="flex flex-row items-center h-12">
          <Skeleton height={48} width={80} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col items-center justify-between h-fit pb-20 p-10 mb-4 bg-white dark:bg-black rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <Image
          src={`/college_flags/${stats?.name}.png`}
          alt={`${stats?.name}_flag`}
          width="64"
          height="64"
        />
        <div className="pl-4">
          <p className="text-blue-600 text-lg font-semibold">
            {stats?.name} is in {getPlace(stats?.rank)} place with{" "}
            {stats?.points} points{(stats?.rank ?? 0) <= 3 ? "! 🎉" : ""}
          </p>
        </div>
      </div>
      <div>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {stats?.games} games played
        </p>
      </div>
      {/* Progress Bar Section */}
      <div className="flex flex-row flex-wrap gap-4 items-center h-7">
        <div
          className="flex flex-col items-center justify-center font-bold text-sm h-full"
          style={{ width: getRatioAsString(stats?.wins, stats?.games) }} // adjust width dynamically
        >
          <div className="flex w-full items-center justify-center bg-green-400 dark:bg-green-700 py-1 grow">
            <p>{stats?.wins}</p>
          </div>
          <p className="text-xs font-medium ">
            win{stats?.wins == 1 ? "" : "s"}
          </p>
        </div>

        <div
          className="flex flex-col items-center justify-center  font-bold text-sm h-full"
          style={{ width: getRatioAsString(stats?.ties, stats?.games) }}
        >
          <div className="flex w-full items-center justify-center bg-yellow-300 py-1 dark:bg-yellow-500 dark:text-white py-1 px-2 grow">
            <p>{stats?.ties}</p>
          </div>
          <p className="text-xs font-medium ">
            tie{stats?.ties == 1 ? "" : "s"}
          </p>
        </div>

        <div
          className="flex flex-col items-center justify-center font-bold text-sm h-full"
          style={{ width: getRatioAsString(stats?.losses, stats?.games) }}
        >
          <div className="flex w-full items-center justify-center bg-red-400 dark:bg-red-500 py-1 px-2 grow">
            <p>{stats?.losses}</p>
          </div>
          <p className="text-xs font-medium ">
            loss{stats?.losses == 1 ? "" : "es"}
          </p>
        </div>

        <div
          className="flex flex-col items-center justify-center font-bold text-sm h-full"
          style={{ width: getRatioAsString(stats?.forfeits, stats?.games) }}
        >
          <div className="flex w-full items-center justify-center py-1 px-2 grow bg-slate-400 dark:bg-slate-600">
            <p>{stats?.forfeits}</p>
          </div>
          <p className="text-xs font-medium">
            forfeit{stats?.forfeits == 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollegeSummaryCardMobile;

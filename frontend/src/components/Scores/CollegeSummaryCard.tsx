import Skeleton from "react-loading-skeleton";
import Image from "next/image";
import { CollegeSummaryCardProps } from "@src/types/components";

import {
    getPlace,
    getRatioAsString
  } from "@src/data/helpers";



const CollegeSummaryCard: React.FC<CollegeSummaryCardProps> = ({
    stats,
    isLoading,
  }) => {
    // loading skeleton is not necessarily needed just thought it might be a smoother transition (react-loading-skeleton)
    if (isLoading) {
      return (
        <div className="flex-col items-center h-56 p-8 md:mx-20 md:px-20 mb-4 py-10 bg-white rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <div className="pr-4 flex flex-col justify-between h-full">
              <Skeleton height={24} width={200} />
              <Skeleton height={20} width={150} />
            </div>
            <Skeleton circle={true} height={64} width={64} />
          </div>
          <div className="flex flex-row items-center h-12">
            <Skeleton height={48} width={80} />
            <Skeleton height={48} width={80} />
            <Skeleton height={48} width={80} />
            <Skeleton height={48} width={80} />
          </div>
        </div>
      );
    }

    return (
      <div className="flex-col items-center p-8 md:mx-20 md:px-20 mb-4 py-10 bg-white rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="pr-4 flex flex-col justify-between h-full">
            <p className="text-blue-600 text-lg font-semibold">
              {stats?.name} is in {getPlace(stats?.rank)} place with{" "}
              {stats?.points} points{(stats?.rank ?? 0) <= 3 ? "! 🎉" : ""}
            </p>
            <p className="text-gray-700">{stats?.games} games played</p>
          </div>
          <Image
            src={`/college_flags/${stats?.name}.png`}
            alt={`${stats?.name}_flag`}
            width="64"
            height="64"
          />
        </div>

        {/* Progress Bar Section */}
        <div className="flex flex-row items-center h-12">
          <div
            className="flex flex-col items-center justify-center text-black font-bold text-sm h-full"
            style={{ width: getRatioAsString(stats?.wins, stats?.games) }} // adjust width dynamically
          >
            <div className="flex w-full items-center justify-center bg-green-400 py-1 grow">
              <p>{stats?.wins}</p>
            </div>
            <p className="text-xs font-medium text-black">
              win{stats?.wins == 1 ? "" : "s"}
            </p>
          </div>

          <div
            className="flex flex-col items-center justify-center text-black font-bold text-sm h-full"
            style={{ width: getRatioAsString(stats?.ties, stats?.games) }}
          >
            <div className="flex w-full items-center justify-center bg-yellow-300 py-1 grow">
              <p>{stats?.ties}</p>
            </div>
            <p className="text-xs font-medium text-black">
              tie{stats?.ties == 1 ? "" : "s"}
            </p>
          </div>

          <div
            className="flex flex-col items-center justify-center text-black font-bold text-sm h-full"
            style={{ width: getRatioAsString(stats?.losses, stats?.games) }}
          >
            <div className="flex w-full items-center justify-center bg-red-400 py-1 grow">
              <p>{stats?.losses}</p>
            </div>
            <p className="text-xs font-medium text-black">
              loss{stats?.losses == 1 ? "" : "es"}
            </p>
          </div>

          <div
            className="flex flex-col items-center justify-center text-black font-bold text-sm h-full"
            style={{ width: getRatioAsString(stats?.forfeits, stats?.games) }}
          >
            <div className="flex w-full items-center justify-center bg-slate-400 py-1 grow">
              <p>{stats?.forfeits}</p>
            </div>
            <p className="text-xs font-medium text-black">
              forfeit{stats?.forfeits == 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  export default CollegeSummaryCard;
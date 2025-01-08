import React from "react";
import Image from "next/image";
import { FaCaretDown } from "react-icons/fa";
import { FaCaretUp } from "react-icons/fa";

type props = {
    imgSrc: string,
    imgsConfig: string
    overlaySrc: string,
    overlayHeight: number,
    overlayWidth: number,
    overlayConfig: string,
    onSelect: Function,
    posHeight: string,
    college: {
        abbreviation: string,
        forfeits: number,
        games: number,
        id: string,
        losses: number,
        name: string,
        points: number,
        prevRank: number,
        rank: number,
        ties: number,
        today: string,
        wins: number,
    }
}

const CPodium: React.FC<props> = ({ imgSrc, overlaySrc, overlayHeight, overlayWidth, overlayConfig, college, imgsConfig, onSelect, posHeight }) => {
    return (
        <div
            className={`flex flex-col w-full cursor-pointer items-center relative md:block ${college.rank === 2 || college.rank === 3 ? 'hidden' : ''}`}
            onClick={() => onSelect(college.name)}
        >
            <div className={`relative ${imgsConfig} w-full -mb-10`}>
                <Image
                    src={imgSrc}
                    alt={college.name}
                    width={120}
                    height={120}
                    className="absolute top-[32%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 mg:h-[146px] mg:w-[120px] h-[115px] w-[93px]"
                />
                <Image
                    src={overlaySrc}
                    alt="Overlay"
                    width={overlayWidth}
                    height={overlayHeight}
                    className={`absolute top-[32%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${overlayConfig}`}
                />
            </div>
            <div className={`flex flex-col items-center justify-center rounded-t-2xl px-5 md:w-full ${posHeight} bg-blue-300 text-black dark:bg-black dark:text-white text-center`}>
                <h1 className="mg:mb-2 mg:text-lg text-sm font-bold">{college.name}</h1>
                <p className="mb-1 mg:text-sm text-xs ">{college.points} points</p>
                <div className="flex flex-row gap-3 mg:mb-1">
                    {college.prevRank - college.rank > 0 && <FaCaretUp size={32} style={{ color: '00C707' }} />}
                    {college.prevRank - college.rank < 0 && <FaCaretDown size={32} style={{ color: 'DF2C2C' }} />}
                    <h1 className="mg:text-5xl text-4xl font-bold">
                        {college.rank}
                        <sup className=" text-2xl mg:text-3xl">
                            {college.rank === 1 && 'st'}
                            {college.rank === 2 && 'nd'}
                            {college.rank === 3 && 'rd'}
                        </sup>
                    </h1>
                </div>
                <p className="mg:text-sm text-xs ">{college.wins} Win{college.wins > 1 ? 's' : ''}, {college.ties} Tie{college.ties > 1 ? 's' : ''}, </p>
                <p className="mg:text-sm text-xs ">{college.losses} {college.losses > 1 ? 'Losses' : 'Loss'}, {college.forfeits} Forfeit{college.forfeits > 1 ? 's' : ''}</p>
            </div>
        </div>
    )
}

export default CPodium;
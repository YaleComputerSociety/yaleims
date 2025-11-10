import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";
import { useSeason } from "@src/context/SeasonContext";
import Image from "next/image";
import { getCollegeFlag } from "@/utils/versionedImages";

export default function StatsBox() {    
    const { user } = useUser();
    const { currentSeason } = useSeason();
    const [ userStats, setUserStats ] = useState<any>(null);

    useEffect(() => {
        if (!user) return;

        const fetchUserStats = async () => {
            try {
                const response = await fetch(`/api/functions/getUserStats?seasonId=${currentSeason?.year || "2025-2026"}&email=${user.email}`);
                if (!response.ok) throw new Error("Error fetching user stats");
                const data = await response.json();
                setUserStats(data)
            } catch (error) {
                console.error("Failed to fetch points:", error);
            }
        }

        fetchUserStats();
    }, []);

    if (!user) return null;
    return (
        <div className="flex md:flex-row gap-x-4 items-center">
            <Image
                src={getCollegeFlag(user.college)}
                alt={user.college}
                width={100}
                height={100}
                className="rounded-md object-contain
                 w-12 h-12 
                 sm:w-16 sm:h-16
                 md:w-20 md:h-20 
                 lg:w-24 lg:h-24"
            />
            <div className="mt-2 md:text-sm text-xs mg:text-base">
                <h3 className="font-semibold">{user.college}</h3>
                <p className="">YCoins: {userStats?.points.toFixed(0)}</p>
                <p className="">Games Played: {userStats?.matches.length}</p>
                <p className="">Correct Predictions: {userStats?.correctPredictions}</p>
            </div>
        </div>
    )
        
}

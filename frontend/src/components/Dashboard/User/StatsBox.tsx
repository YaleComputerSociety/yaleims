import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";
import { useSeason } from "@src/context/SeasonContext";

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
        <div className="flex flex-col md:flex-row gap-x-4">
            <img
                src={`/college_flags/${user.college}.png`}
                alt={user.college}
                width={100}
                height={100}
                className="rounded-md object-contain"
            />
            <div className="mt-2">
                <h3 className="text-lg font-semibold">{user.college}</h3>
                <p className="text-base">Points: {userStats?.points.toFixed(0)}</p>
                <p className="text-base">Games Played: {userStats?.matches.length}</p>
                <p className="text-base">Correct Predictions: {userStats?.correctPredictions}</p>
            </div>
        </div>
    )
        
}

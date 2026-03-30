import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";
import { useSeason } from "@src/context/SeasonContext";
import Image from "next/image";
import { getCollegeFlag } from "@/utils/versionedImages";
import { getYCoinImage } from "@/utils/versionedImages";

interface UserStats {
  points: number;
  matches: any[];
  correctPredictions: number;
}

export default function HeroStats() {
  const { user } = useUser();
  const { currentSeason } = useSeason();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/functions/getUserStats?seasonId=${currentSeason?.year || "2025-2026"}&email=${user.email}`
        );
        if (!response.ok) throw new Error("Error fetching user stats");
        const data = await response.json();
        setUserStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [user, currentSeason]);

  if (!user) return null;

  const stats = [
    {
      label: "YCoins",
      value: loading ? "..." : userStats?.points?.toFixed(0) || "0",
      icon: "ycoin",
      gradient: "from-amber-400/60 to-yellow-500/30",
      border: "border-amber-500/30",
    },
    {
      label: "Games Played",
      value: loading ? "..." : userStats?.matches?.length || "0",
      icon: "🎮",
      gradient: "from-blue-500/20 to-cyan-500/20",
      border: "border-blue-500/30",
    },
    {
      label: "Correct Predictions",
      value: loading ? "..." : userStats?.correctPredictions || "0",
      icon: "✓",
      gradient: "from-emerald-500/20 to-green-500/20",
      border: "border-emerald-500/30",
    },
  ];

  return (
    <div className="mb-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Image
            src={getCollegeFlag(user.college)}
            alt={user.college}
            width={80}
            height={80}
            className="rounded-xl object-contain w-16 h-16 md:w-20 md:h-20"
          />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back, {user.firstname || user.name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-sm md:text-base text-gray-400">
            {user.college} • {currentSeason?.year} {currentSeason?.season ? currentSeason.season.charAt(0).toUpperCase() + currentSeason.season.slice(1) : ""} Season
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`
              relative overflow-hidden rounded-xl p-4 md:p-6
              bg-gradient-to-br ${stat.gradient}
              backdrop-blur-sm
              transition-all duration-300
              hover:scale-[1.02] hover:shadow-lg hover:shadow-white/5
            `}
          >
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl mb-1">
                {stat.icon === "ycoin" ? (
                <Image
                  src={getYCoinImage()}
                  alt="YCoin"
                  width={24}
                  height={24}
                  className="inline-block"
                />) : (stat.icon)}
              </span>
              <span className="text-2xl md:text-4xl font-bold tracking-tight">
                {stat.value}
              </span>
              <span className="text-xs md:text-sm text-gray-400 mt-1">
                {stat.label}
              </span>
            </div>
            {/* Decorative element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

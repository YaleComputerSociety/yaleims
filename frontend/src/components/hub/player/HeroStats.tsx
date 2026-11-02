import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useSeason } from "@/context/SeasonContext";
import Image from "next/image";
import { getCollegeFlag } from "@/utils/versionedImages";
import { fetchMyMatches } from "@/lib/api/me";
import { collegeName } from "@/lib/colleges";

export default function HeroStats() {
  const { viewer } = useSession();
  const { currentSeason } = useSeason();
  // How many games the user signed up for this season.
  const [gamesPlayed, setGamesPlayed] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer || !currentSeason) return;
    let live = true;
    setLoading(true);
    fetchMyMatches({ seasonId: currentSeason.id })
      .then(
        ({ total }) => live && setGamesPlayed(total),
        (error) => console.error("Failed to fetch stats:", error)
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [viewer, currentSeason]);

  if (!viewer) return null;

  const stats = [
    {
      label: "Games Played",
      value: loading ? "..." : gamesPlayed || "0",
      icon: "🎮",
      gradient: "from-blue-500/20 to-cyan-500/20",
      border: "border-blue-500/30",
    },
  ];

  return (
    <div className="mb-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <Image
            src={getCollegeFlag(collegeName(viewer.collegeId) ?? "")}
            alt={collegeName(viewer.collegeId) ?? ""}
            width={80}
            height={80}
            className="rounded-xl object-contain w-16 h-16 md:w-20 md:h-20"
          />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome back, {viewer.name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            {collegeName(viewer.collegeId) ?? ""} • {currentSeason?.id} {currentSeason?.currentTerm ? currentSeason.currentTerm.charAt(0).toUpperCase() + currentSeason.currentTerm.slice(1) : ""} Season
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
              bg-white/80 border border-black/5 shadow-sm
              dark:bg-transparent dark:border-transparent dark:shadow-none
              bg-gradient-to-br ${stat.gradient}
              backdrop-blur-sm
              transition-all duration-300
              hover:scale-[1.02] hover:shadow-lg hover:shadow-white/5
            `}
          >
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl mb-1">
                {stat.icon}
              </span>
              <span className="text-2xl md:text-4xl font-bold tracking-tight">
                {stat.value}
              </span>
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
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

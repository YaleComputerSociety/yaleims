import { useSeason } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import SportCard from "@/components/about/SportCard";

/** The sports the user captains this season (from the session). */
export default function ViewCaptainSports() {
    const { viewer } = useSession();
    const { currentSeason } = useSeason();
    const captainSports = (currentSeason?.sports ?? [])
        .filter((sport) => viewer?.captainOf.includes(sport.id))
        .map((sport) => sport.name);

    if (!currentSeason) return <div className="p-3 text-sm">Loading…</div>;
    if (captainSports.length === 0) return <div className="p-3 text-red-400 text-sm">You are not a captain</div>;

    return (
        <div className="p-3 flex items-start flex-col gap-y-3">
            {captainSports.map((sport) =>
            <div key={sport} className="flex-row text-sm flex items-center gap-x-2">
                <SportCard
                    sport={sport}
                    displayName={false}
                />
                {sport}
            </div>
            )}
        </div>
    )
}

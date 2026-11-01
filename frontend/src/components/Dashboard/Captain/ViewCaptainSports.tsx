
import { useEffect, useState } from "react";
import { useUser } from "@src/context/UserContext";
import SportCard from "@src/app/About/SportCard";
import type { CaptainSportsResponse } from "@src/types/api";

export default function ViewCaptainSports() {
    const { user } = useUser();
    const [captainSports, setCaptainSports] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.email) return;                // wait for auth/context
        fetch(`/api/functions/getCaptainSports?email=${encodeURIComponent(user.email)}`)
            .then((res) => res.json() as Promise<CaptainSportsResponse>)
            .then((data) => {
                // Not a captain: an error object instead of a list.
                setCaptainSports(Array.isArray(data) ? data : []);
                setError(Array.isArray(data) ? null : "You are not a captain");
            })
            .catch((err) => {
                console.error(err);
                setError("Couldn’t load your sports");
            })
            .finally(() => setLoading(false));
    }, [user?.email]);


    if (loading) return <div className="p-3 text-sm">Loading…</div>;
    if (error)   return <div className="p-3 text-red-400 text-sm">{error}</div>;

    return (
        <div className="p-3 flex items-start flex-col gap-y-3">
            {captainSports.map((sport, index) =>
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
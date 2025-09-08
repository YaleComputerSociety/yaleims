
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useUser } from "@src/context/UserContext";
import SportCard from "@src/app/About/SportCard";

export default function ViewCaptainSports() {
    const { user } = useUser();
    const [captainSports, setCaptainSports] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.email) return;                // wait for auth/context
        const ref = doc(db, "users", user.email);

        const unsub = onSnapshot(ref,
            snap => {
                if (!snap.exists()) {
                setError("User not found");
                setCaptainSports([]);
                setLoading(false);
                return;
                }

                const data = snap.data() as any;
                const isCaptain = data.mRoles?.includes("captain");
                const sportsArr = Array.isArray(data.sportsCaptainOf)
                ? data.sportsCaptainOf
                : [];

                if (!isCaptain) {
                setError("You are not a captain");
                setCaptainSports([]);
                } else {
                setError(null);
                setCaptainSports(sportsArr);
                }
                setLoading(false);
            }, err => {
                    console.error(err);
                    setError("Listener failed");
                    setLoading(false);
                }
            );

        return () => unsub(); 
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
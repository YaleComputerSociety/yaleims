import { useUser } from "@src/context/UserContext";
import { useEffect, useState } from "react";
import SportCard from "@src/app/About/SportCard";

export default function ViewCaptainSports() {
    const { user } = useUser();
    const [captainSports, setCaptainSports] = useState<string[]>([]);
    const [sportsLoading, setSportsLoading] = useState<boolean>(true);

    const fetchSports = async () => {
        try {
            const response = await fetch(`/api/functions/getCaptainSports?email=${user?.email}`)
            if (!response.ok) return new Error("Error fetching captain sports")
            const data = await response.json()
            setCaptainSports(data)
        } catch(error) {
            console.error(error)
        } finally {
            setSportsLoading(false)
        }
    }

    useEffect(() => {
        fetchSports()
    }, [])

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
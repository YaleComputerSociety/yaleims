import { seasonSports } from "@src/utils/helpers"
import { useSeason } from "@src/context/SeasonContext"
import { useEffect, useMemo, useState } from "react"
import LoadingScreen from "@src/components/LoadingScreen"

interface User {
  email: string
  firstname: string
  lastname: string
  captain: string[]
}

interface Captain {
    email: string,
    sportsCaptainOf: string[]
}

export default function AssignCaptain() {
    const { currentSeason } = useSeason()
    const [usersInCollege, setUsersInCollege] = useState<User[]>([])
    const [currentCaptains, setCurrentCaptains] = useState<Captain[]>([])
    const [loading, setLoading] = useState(false)
    const [selectSport, setSelectSport] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [selectUser, setSelectUser] = useState<User | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/functions/getUsersInCollege")
            if (!res.ok) throw new Error(res.statusText)
            const data = await res.json()
            setUsersInCollege(data.users)
            setCurrentCaptains(data.captains)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }
    
    useEffect(() => {
        fetchData()
    }, [])

    const filteredUsers = useMemo(() => {
        const term = searchTerm.toLowerCase()
        if (!term) return []
        return usersInCollege.filter((u) => {
            const fullName = `${u.firstname} ${u.lastname}`.toLowerCase()
            return fullName.includes(term) || u.email.toLowerCase().includes(term)
        })
    }, [searchTerm, usersInCollege])

    if (loading || !currentSeason) {
        return <LoadingScreen />
    }

    const assignCaptain = async () => {
        if (!selectUser || !selectSport) return
        console.log("assigning captain....")
        try {
            const response = await fetch("/api/functions/assignRemoveCaptain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: selectUser.email,
                    sport: selectSport,
                    assign: true,
                    remove: false
                })
            })
            const message = await response.json()
            console.log(message)
        } catch (error) {
            console.log("error assigning captain")
        } finally {
            await fetchData()
            console.log("Assigned Captain")
        }
    }

    const removeCaptain = async () => {
        if (!selectUser || !selectSport) return
        console.log("removing captain....")
        try {
            const response = await fetch("/api/functions/assignRemoveCaptain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: selectUser.email,
                    sport: selectSport,
                    assign: false,
                    remove: true
                })
            })
            const message = await response.json()
            console.log(message)
        } catch (error) {
            console.log("error assigning captain")
        } finally {
            await fetchData()
            console.log("Assigned Captain")
        }
    }

    const currentSports = seasonSports[currentSeason.season]
    const sportsSet = [
        ...new Set(
            currentCaptains.flatMap((captain) => captain.sportsCaptainOf)
        )
    ];

    return (
        <div className="space-y-4">
            {currentCaptains.length < 0 ? 
                <div>
                    {`No Captains set for ${currentSeason.season} sports yet!`}<br/>
                    Select Captains Below!
                </div> : 
                <div>
                    {`There are ${currentCaptains.length} captains set`}<br/>
                    You can assign new captains or reassign them below!
                </div>}
            <button
                className="px-2 py-1 mp:px-3 mp:py-2 text-xs xs:text-sm mp:text-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-md mg:rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
                onClick={() => {
                    assignCaptain();
                }}
            >
                Assign Captain
            </button>
            <button
                className="px-2 py-1 mp:px-3 mp:py-2 text-xs xs:text-sm mp:text-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-md mg:rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
                onClick={() => {
                    removeCaptain();
                }}
            >
                Remove Captain
            </button>
            <select
                name="sports"
                onChange={(e) => setSelectSport(e.target.value)}
                className="rounded p-1 bg-white dark:bg-black"
                value={selectSport}
            >
                <option value="">— pick a sport —</option>
                {currentSports.map((s) => {
                    if (sportsSet.includes(s)) return
                    return <option key={s} value={s}>{s}</option>
                })}
            </select>

            <div className="relative w-80">
                <input
                    type="seacrh"
                    autoComplete="off"
                    placeholder="Search by name or email…"
                    className="w-full rounded border px-3 py-1"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {searchTerm && filteredUsers.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border bg-white dark:bg-gray-800">
                    {filteredUsers.slice(0, 10).map((u) => (
                    <li
                        key={u.email}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => {
                        setSelectUser(u)
                        setSearchTerm("")    
                        }}
                    >
                        {u.firstname} {u.lastname} &nbsp;
                        <span className="text-xs text-gray-500">({u.email})</span>
                    </li>
                    ))}
                </ul>
                )}
            </div>

            {selectUser && (
                <div className="rounded bg-green-100 p-2 text-sm">
                    Selected captain:{" "}
                    <strong>
                        {selectUser.firstname} {selectUser.lastname}
                    </strong>
                </div>
            )}
            
        </div>
    )
}

import { useEffect, useMemo, useState } from "react"
import LoadingScreen from "@src/components/LoadingScreen"
import { useSeason } from "@src/context/SeasonContext"
import { seasonStart, getCurrentWeekId } from "@src/utils/helpers"
import { toast } from "react-toastify"

interface User {
  email: string
  firstname: string
  lastname: string
  captain: string[]
  college: string
}

export default function SelectMVP() {
    const [usersInCollege, setUsersInCollege] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [settingMVP, setSettingMVP] = useState(false)
    const { currentSeason } = useSeason()
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [selectUser, setSelectUser] = useState<User | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/functions/getUsersInCollege?wantCaptains=false")
            if (!res.ok) throw new Error(res.statusText)
            const data = await res.json()
            console.log(data)
            setUsersInCollege(data.users)
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

    const selectMvp = async () => {
        if (!selectUser) return
        const weekId = getCurrentWeekId(seasonStart);
        console.log(weekId)
        try {
            setSettingMVP(true)
            await fetch("/api/functions/setMVP", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    season: currentSeason.year,
                    residentialCollege: selectUser.college,
                    weekId: weekId,
                    mvpEmail: selectUser.email,
                }),
            });
        } catch (error) {
            console.log(error)
        } finally {
            toast.success("set MVP Successfully")
            setSettingMVP(false)
            setSelectUser(null)
            setSearchTerm("")
        }
    }

    return (
        <div className="space-y-4">
            <button
                className="px-2 py-1 mp:px-3 mp:py-2 text-xs xs:text-sm mp:text-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-md mg:rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
                onClick={selectMvp}
            >
                Select MVP
            </button>
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

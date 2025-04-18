import { cookies } from "next/headers"

const ApiDocs = () => {
    const addNewApi = async () => {
        try {
            const cookieStore = await cookies()
            const token = cookieStore.get('token')
            console.log(token)
            if (!token?.value) {
                console.error("Token not found")
                return
            }
            const response = await fetch("https://publicapisignup-65477nrg6a-uc.a.run.app", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token.value}`
                },
                body: JSON.stringify({
                    apiKey: "eda35",
                })
            })
            if (!response.ok) {
                throw new Error("Network response was not ok")
            }
            const data = await response.json()
            console.log("API key added successfully:", data)
        } catch (error) {
            console.error("Error adding new API key:", error)
        }
    }
    addNewApi()

    return (
        <div className="mt-20">
            <h1>API DOCS</h1>
        </div>
    )
}

export default ApiDocs

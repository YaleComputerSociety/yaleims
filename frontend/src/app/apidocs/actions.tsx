"use server"

import { cookies } from "next/headers"
import { functionUrl } from "@/utils/functionUrls"

export const addNewApi = async (description: string) => {
    try {
        if (description === "") {
            console.error("API key is required")
            return
        }
        const cookieStore = await cookies()
        const token = cookieStore.get('token')
       
        if (!token?.value) {
            console.error("Token not found")
            return
        }
        console.log(token.value)
        const response = await fetch(functionUrl("publicApiSignup"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token.value}`
            },
            body: JSON.stringify({ description })
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
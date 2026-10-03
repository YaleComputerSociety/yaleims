"use server"

import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import { functionUrl } from "@/utils/functionUrls"
import { adminDb } from "../../../lib/firebaseAdmin"

export type ApiKey = { description: string; apiKey: string }

// The signed-in user's own API keys. Read on the server because API keys are
// secrets: Firestore rules don't let the browser read them.
export const getMyApiKeys = async (): Promise<ApiKey[]> => {
    const token = (await cookies()).get("token")?.value
    const secret = process.env.JWT_SECRET
    if (!token || !secret) return []
    let email: unknown
    try {
        email = (jwt.verify(token, secret) as { email?: unknown }).email
    } catch {
        return []
    }
    if (typeof email !== "string") return []

    const snap = await adminDb
        .collection("users")
        .doc(email)
        .collection("api_keys")
        .orderBy("createdAt", "asc")
        .get()
    return snap.docs.map((d) => ({
        description: d.get("description") || "",
        apiKey: d.get("apiKey") || "",
    }))
}

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
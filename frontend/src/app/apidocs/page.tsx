"use client"
import { useState, useEffect } from "react"
import { addNewApi } from "./actions"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { db } from "../../../lib/firebase"
import { useUser } from "@src/context/UserContext"
import KeyList from "@src/components/APIKeyList"

const ApiDocs = () => {
    const [ description, setDescription ] = useState<string>("")
    const [apiKeys, setApiKeys] = useState<{ description: string; apiKey: string }[]>([])
    const { user } = useUser()

    useEffect(() => {
        if (!user?.email) return;
        const apiKeysRef = collection(db, "users", user.email, "api_keys");
        const q = query(apiKeysRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const updateApiKeys = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    description: data.description || "",
                    apiKey: data.apiKey || "",
                };
            });
            setApiKeys(updateApiKeys as { description: string; apiKey: string }[]);
        });
    
        return () => unsubscribe();
    }, [user?.email])

    if (!user) {
        return (
            <div className="mt-20 mb-20 items-center flex flex-col">
                <h1 className="md:text-4xl text-xl font-bold text-center xs:mb-4 pt-8">
                    YaleIMs API
                </h1>
                <div className="w-[90%] md:[75%] mg:w-[60%] px-10">
                    <p className="text-center">Please log in to view this page.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-20 mb-20 items-center flex flex-col">
            <h1 className="md:text-4xl text-xl font-bold text-center xs:mb-4 pt-8">
                YaleIMs API
            </h1>
            <div className="w-[90%] md:[75%] mg:w-[60%] px-10">
                <div className="justify-center mt-8">
                    <p>
                        The YaleIMs API can be used to programmatically query information about intramurals in your own programs and software projects. 
                        Data is served in a developer-friendly JSON format.
                    </p>
                </div>
                <h1 className="md:text-3xl text-left text-xl font-bold xs:mb-4 pt-8">
                    Authentication
                </h1>
                <p>
                    In order to verify your identity, you must create an API key below. 
                    When making HTTPS queries to the API, you must include this key in the Authorization header, prepended by the word Bearer.
                    You should keep your API key a secret as if it were a password, as anyone with access to it can act on your behalf. 
                    Do not ship your API key with your client code, and do not commit it to version control.
                </p>
                <div className="mt-5">
                    <KeyList items={apiKeys} />
                </div>                
                <div className="flex mt-5">
                    <input 
                        onChange={(e) => setDescription(() => e.target.value)}
                        type="text"
                        value={description}
                        className="rounded-md p-2 mr-5 placeholder-gray-400 text-black dark:text-white bg-white dark:bg-black focus:outline-none text-sm focus:ring-2 focus:ring-blue-400"
                        placeholder="Enter Description" 
                    />
                    <button
                        className="px-3 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white font-semibold rounded-lg shadow-md hover:scale-105 transition transform duration-200 ease-in-out"
                        onClick={() =>                 
                            addNewApi(description)
                            .then(() => {
                                setDescription(() => "")
                            })
                        }
                    >
                        Create Key
                    </button>
                </div>
                <h1 className="md:text-3xl text-left text-xl font-bold xs:mb-4 pt-8">
                    Documentation
                </h1>
                <p>
                    POST: https://yaleims.com/api/v1/getLeaderboard <br/>
                </p>
            </div>
        </div>
    )
}

export default ApiDocs

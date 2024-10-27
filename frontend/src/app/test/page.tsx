"use client";

import { useEffect, useState } from "react";

const TestPage: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("https://getleaderboard-65477nrg6a-uc.a.run.app", {
                    method: "GET", // or 'POST', depending on your cloud function
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`Error: ${response.statusText}`);
                }

                const result = await response.json();
                setData(result);
            } catch (error: any) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="text-white">
            <div className="h-100">HI</div>
            <br></br>
            <br></br>
            <br></br>
            <div>Hello</div>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
};

export default TestPage;

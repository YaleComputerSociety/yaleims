"use client";

import BracketAdminPanel from "@src/components/Dashboard/Admin/BracketAdminPanel";
import PageHeading from "@src/components/PageHeading";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const match_to_score = {
  matchId: 2,
  homeScore: 2,
  awayScore: 3,
  homeForfeit: false,
  awayForfeit: false,
  sport: "Indoor Soccer"
}
const handleScore = async () => {
  try {
    const response =await fetch("https://scorematchtesting-65477nrg6a-uc.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(match_to_score)
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error scoring matches:", error);
  }
}

const UploadBracketsPage = () => {
  return (
    <div className="min-h-screen pt-20">
      <PageHeading heading="Upload/Delete Brackets" />
      <BracketAdminPanel />
      <button onClick={handleScore} className="bg-blue-400 p-3" >Score Match Testing</button>
    </div>
  );
};

export default withRoleProtectedRoute(UploadBracketsPage, ["admin", "dev"]);

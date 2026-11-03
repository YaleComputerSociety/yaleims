"use client";

import TournamentAdminPanel from "@/components/hub/admin/TournamentAdminPanel";
import BracketBuilder from "@/components/hub/admin/BracketBuilder";
import PageHeading from "@/components/layout/PageHeading";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import React, { useState } from "react";

/** Tournaments: the quick builder, then the season's tournaments (delete) and the slot-by-slot editor. */
const UploadTournamentsPage = () => {
  // A new tournament reloads the list below.
  const [created, setCreated] = useState(0);
  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="Tournaments" />
      <section className="max-w-4xl mt-8 mx-3 sm:mx-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50 p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-1">New tournament</h2>
        <p className="text-sm text-gray-500 mb-4">
          A one-day bracket of 14 colleges with placement points; its games go on the schedule.
        </p>
        <BracketBuilder kind="tournament" onCreated={() => setCreated((n) => n + 1)} />
      </section>
      <TournamentAdminPanel key={created} />
    </div>
  );
};

export default withRoleProtectedRoute(UploadTournamentsPage, (viewer) => viewer.can.editSchedule);

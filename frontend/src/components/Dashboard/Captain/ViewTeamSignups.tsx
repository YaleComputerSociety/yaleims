import React from "react";

interface ViewTeamSignupsProps {
  sport: string | undefined;
}
const ViewTeamSignups: React.FC<ViewTeamSignupsProps> = ({ sport }) => {
  return (
    <div>
      <h3 className="text-lg font-bold mb-2">View Your Teams</h3>
      {sport && <p className="border rounded px-3 py-2">{sport}</p>}
    </div>
  );
};

export default ViewTeamSignups;

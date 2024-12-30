import { toCollegeName } from "@src/utils/helpers";
import { MatchSignUpProps } from "@src/types/components";

const SignUpModal: React.FC<MatchSignUpProps> = ({ match, onConfirm, onCancel }) => {
  const matchDate = match.timestamp
    ? new Date(match.timestamp).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date TBD";

  const matchTime = match.timestamp
    ? new Date(match.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Time TBD";

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4">Sign Up for Match</h2>
        <p className="mb-2">
          <strong>{toCollegeName[match.home_college || "TBD"]}</strong> vs{" "}
          <strong>{toCollegeName[match.away_college || "TBD"]}</strong>
        </p>
        <p className="mb-2">Sport: {match.sport}</p>
        <p className="mb-4">
          {matchDate} at {matchTime}
        </p>
        <button
          onClick={onConfirm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg mt-4 w-full"
        >
          Confirm Sign-Up
        </button>
        <button
          onClick={onCancel}
          className="bg-light_grey text-blue-600 px-4 py-2 rounded-lg mt-2 w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SignUpModal;

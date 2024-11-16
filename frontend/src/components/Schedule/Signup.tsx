import { Match } from "../../data/matches";

interface SignUpProps {
    match: Match;
    onConfirm: () => void;
    onCancel: () => void;
  }

const SignUpModal: React.FC<SignUpProps> = ({ match, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-2xl font-bold mb-4">Sign Up for Match</h2>
        <p>{match.college1} vs {match.college2} on {match.date} at {match.time}</p>
        <button onClick={onConfirm} className="bg-green-600 text-white px-4 py-2 rounded-lg mt-4">Confirm Sign-Up</button>
        <button onClick={onCancel} className="bg-red-600 text-white px-4 py-2 rounded-lg mt-2">Cancel</button>
      </div>
    </div>
  );
  
  export default SignUpModal;
  
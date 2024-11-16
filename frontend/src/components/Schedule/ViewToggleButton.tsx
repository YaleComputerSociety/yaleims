interface ViewToggleButtonProps {
    view: "list" | "calendar";
    setView: React.Dispatch<React.SetStateAction<"list" | "calendar">>;
  }

const ViewToggleButton: React.FC<ViewToggleButtonProps> = ({ view, setView }) => (
    <div className="text-center mb-8">
      <button
        onClick={() => setView(view === "list" ? "calendar" : "list")}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        {view === "list" ? "Switch to Calendar View" : "Switch to List View"}
      </button>
    </div>
  );
  
  export default ViewToggleButton;
  
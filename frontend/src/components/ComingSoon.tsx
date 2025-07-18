import React from "react";

const ComingSoon = () => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
        <p className="text-white text-opacity-80">
          This feature is under development. Check back soon!
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;

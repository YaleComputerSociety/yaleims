import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-blue-600 z-50">
      <img
        src="/loader_animations/sport_loader.gif"
        alt="Loading..."
        className="object-contain max-w-full max-h-full"
      />
    </div>
  );
};

export default LoadingScreen;

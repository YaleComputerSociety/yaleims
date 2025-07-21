import React from "react";
import Image from "next/image";
import LoadingSpinner from "./LoadingSpinner";

const LoadingScreen = () => {
  return (
    <div className="flex min-h-[100vh] min-w-fit items-center justify-center z-50 bg-primary_lightest dark:bg-[#0e265c]">
      <LoadingSpinner />
    </div>
  );
};

export default LoadingScreen;

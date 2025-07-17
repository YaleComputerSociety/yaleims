import React from "react";
import Image from "next/image";

const LoadingScreen = () => {
  return (
    <div className="flex min-h-[100vh] min-w-fit items-center justify-center z-50 bg-primary_lightest dark:bg-[#0e265c]">
      <Image
        src="/loader_animations/sport_loader.gif"
        alt="Loading..."
        className="object-contain max-w-full max-h-full"
        width={400}
        height={400}
        priority
      />
    </div>
  );
};

export default LoadingScreen;

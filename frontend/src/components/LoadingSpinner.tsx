import React from "react";
import Image from "next/image";

const LoadingSpinner = () => {
  return (
    <Image
      src="/loader_animations/sport_loader.gif"
      alt="Loading..."
      className="object-contain max-w-full max-h-full"
      width={400}
      height={400}
      priority
    />
  );
};

export default LoadingSpinner;

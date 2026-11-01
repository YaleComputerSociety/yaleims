import React from "react";
import Image from "next/image";
import { getLoaderAnimation } from "@/utils/versionedImages";

const LoadingSpinner = () => {
  return (
    <Image
      src={getLoaderAnimation("sport_loader.gif")}
      alt="Loading..."
      className="object-contain max-w-full max-h-full"
      width={400}
      height={400}
      priority
    />
  );
};

export default LoadingSpinner;

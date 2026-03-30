"use client";

import Image from "next/image";
import { getVersionedImage } from "@/utils/versionedImages";

export default function NotFound() {
  return (
    <div className="max-w-[80%] flex flex-col lg:flex-row items-center justify-center mx-auto mt-24 sm:mt-48 mb-16 lg:mb-72 xl:mb-48  gap-10 lg:gap-20 px-4">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-white mb-4">
          404 Error: Not Found
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Unfortunately, this page does not exist. Please check the URL or go
          back to the homepage.
        </p>
      </div>
      <div>
        <Image
          src={getVersionedImage("404.png")}
          width={450}
          height={450}
          alt="404 illustration"
        />
      </div>
    </div>
  );
}

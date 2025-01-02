import React, { useEffect, useState, useContext } from "react";
import Image from "next/image";

const Podium: React.FC = () => {
    return (
        <div>
        <div className="flex justify-center">
          <div className="">
            <div className="flex flex-col items-center">
                <div className="relative w-[300px] h-[300px] -mb-10">
                  <Image
                    src="/college_flags/Benjamin Franklin.png"
                    alt="Benjamin Franklin"
                    width={180}
                    height={180}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  />
                  <Image
                    src="/college_flags/silver_overlay.png"
                    alt="Overlay"
                    width={240}
                    height={240}
                    className="absolute top-3 left-[30px]"
                  />
                </div>
                <div className="flex items-center justify-center rounded-lg w-48 h-40 bg-yellow-500 text-white dark:bg-black ">
                  <p className="text-xl font-bold">2nd</p>
                </div>
            </div>
          </div>
          <div className="animate-slideUp flex flex-col items-center">
            <div className="relative w-[315px] h-[315px] -mb-10">
              <Image
                src="/college_flags/Benjamin Franklin.png"
                alt="Benjamin Franklin"
                width={180}
                height={180}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              />
              <Image
                src="/college_flags/gold_overlay.png"
                alt="Overlay"
                width={400}
                height={400}
                className="absolute top-5 left-0"
              />
            </div>
            <div className="flex items-center justify-center rounded-lg w-48 h-40 bg-yellow-500 text-white dark:bg-black ">
              <p className="text-xl font-bold">1st</p>
            </div>
          </div>
          <div className="animate-slideUp flex flex-col items-center">
            <div className="relative w-[300px] h-[300px] -mb-10">
              <Image
                src="/college_flags/Benjamin Franklin.png"
                alt="Benjamin Franklin"
                width={180}
                height={180}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              />
              <Image
                src="/college_flags/bronze_overlay.png"
                alt="Overlay"
                width={240}
                height={240}
                className="absolute top-3 left-[30px]"
              />
            </div>
            <div className="flex items-center justify-center rounded-lg w-48 h-40 bg-yellow-500 text-white dark:bg-black ">
              <p className="text-xl font-bold">3rd</p>
            </div>
          </div>
        </div>
    </div>
    )
}

export default Podium;
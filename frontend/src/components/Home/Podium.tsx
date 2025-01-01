import React, { useEffect, useState, useContext } from "react";
import Image from "next/image";

const Podium = (colleges: any) => {
    console.log(colleges.colleges[1])
    console.log(colleges["1"])
    return (
        <div className="flex gap-4 justify-center">
          <div className="flex flex-col items-center justify-center rounded-lg w-48 h-40 bg-podium_light text-white dark:bg-black">
              <p>{colleges.colleges[1]["name"]}</p>
              <p className="text-xl font-bold">2nd</p>
          </div>
          <div className="flex items-center justify-center rounded-lg w-48 h-100 bg-podium_light text-white dark:bg-black">
              <p className="text-xl font-bold">1st</p>
          </div>
          <div className="flex items-center justify-center rounded-lg w-48 h-40 bg-podium_light text-white dark:bg-black">
              <p className="text-xl font-bold">3rd</p>
          </div>
        </div>
    )
}

export default Podium;
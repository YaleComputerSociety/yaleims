"use client";

import { useEffect, useState } from "react";
import AAHomeComponent from "@src/components/Home/AAHomeComponent"
import MVPPopup from "@src/components/Home/MVPPopup"
import Link from "next/link";


const HomePage: React.FC = () => {

  return (
    <div className="min-h-screen">
      <AAHomeComponent />
    </div>
  );
};

export default HomePage;

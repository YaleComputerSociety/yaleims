// "use client";

// import { createContext, useContext, useState, useEffect, ReactNode } from "react";
// import { usePathname } from "next/navigation"; // app router to collapse menu on Brackets Page

// interface NavBarProps {
//   collapsed: boolean | null;
//   onToggleCollapse: () => void;
// }

// const NavbarContext = createContext<NavBarProps>({
//   collapsed: null,
//   onToggleCollapse: () => {},
// });

// export const NavbarProvider = ({ children }: { children: ReactNode }) => {
//   const pathname = usePathname();
//   const [collapsed, setCollapsed] = useState(false);

//   useEffect(() => {
//     console.log("PATHNAME:", pathname); // debug
//     if (pathname?.startsWith("/brackets")) {
//       setCollapsed(true);
//     } else {
//       setCollapsed(false);
//     }
//   }, [pathname]);

//   const onToggleCollapse = () => setCollapsed((c) => !c);

//   return (
//     <NavbarContext.Provider value={{ collapsed, onToggleCollapse }}>
//       {children}
//     </NavbarContext.Provider>
//   );
// };

// export const useNavbar = () => {
//   const nav = useContext(NavbarContext);
//   return nav;
// };

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";


interface NavBarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NavbarContext = createContext<NavBarProps>({
  collapsed: false,
  onToggleCollapse: () => {},
});

export const NavbarProvider = ({ children }: { children: ReactNode }) => {
  // console.log("NavbarProvider is mounting..."); // 👈 runs every render
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const shouldCollapse = pathname?.startsWith("/brackets");
    setCollapsed(!!shouldCollapse);
  
    // console.log("PATHNAME:", pathname);
    // console.log("Collapsed state just set to:", !!shouldCollapse);
  }, [pathname]);
  

  const onToggleCollapse = () => setCollapsed((c) => !c);

  return (
    <NavbarContext.Provider value={{ collapsed, onToggleCollapse }}>
      {children}
    </NavbarContext.Provider>
  );
};

export const useNavbar = () => useContext(NavbarContext);

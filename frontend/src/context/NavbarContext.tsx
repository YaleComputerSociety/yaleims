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

import { createContext, useContext, useState, ReactNode } from "react";


interface NavBarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NavbarContext = createContext<NavBarProps>({
  collapsed: false,
  onToggleCollapse: () => {},
});

export const NavbarProvider = ({ children }: { children: ReactNode }) => {
  // The sidebar is collapsed only when the user collapses it -- no route ever
  // forces it (the brackets page used to collapse it on entry).
  const [collapsed, setCollapsed] = useState(false);

  const onToggleCollapse = () => setCollapsed((c) => !c);

  return (
    <NavbarContext.Provider value={{ collapsed, onToggleCollapse }}>
      {children}
    </NavbarContext.Provider>
  );
};

export const useNavbar = () => useContext(NavbarContext);

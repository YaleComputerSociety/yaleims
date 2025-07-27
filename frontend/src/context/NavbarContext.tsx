"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface NavBarProps {
  collapsed: boolean | null;
  onToggleCollapse: () => void;
}

const NavbarContext = createContext<NavBarProps>({
  collapsed: null,
  onToggleCollapse: () => {},
});

export const NavbarProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const onToggleCollapse= () => setCollapsed((c) => !c)

  return (
    <NavbarContext.Provider value={{collapsed, onToggleCollapse}} >
      {children}
    </NavbarContext.Provider>
  );
};

export const useNavbar = () => {
  const nav = useContext(NavbarContext);
  return nav;
};

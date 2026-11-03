import React, { createContext, useState, ReactNode } from "react";

/** The scores page's filters. */
export interface Filters {
  college: string;
  sport: string;
  date: string;
  selected: string;
}

interface FiltersContextType {
  filter: Filters;
  setFilter: React.Dispatch<React.SetStateAction<Filters>>;
  resetFilters: () => void;
}

// Create the context with an undefined default value
export const FiltersContext = createContext<FiltersContextType>({
  filter: { college: "", sport: "", date: "", selected: ""}, // Provide default values
  setFilter: () => {},
  resetFilters: () => {},
});

interface FiltersProviderProps {
  children: ReactNode; // Allows any valid React children inside the provider
}

// Create the provider component
const FiltersProvider: React.FC<FiltersProviderProps> = ({ children }) => {
  const [filter, setFilter] = useState<Filters>({
    college: "",
    sport: "",
    date: "",
    selected: "",
  });

  const resetFilters = () => {
    setFilter({
      college: "",
      sport: "",
      date: "",
      selected: "",
    });
  };

  return (
    <FiltersContext.Provider value={{ filter, setFilter, resetFilters }}>
      {children}
    </FiltersContext.Provider>
  );
};

export default FiltersProvider;

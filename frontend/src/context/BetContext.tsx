// SharedState.tsx
import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    Dispatch,
    SetStateAction,
  } from 'react';
  
  // 1. Define the shape of your context value
  type SharedStateContextType = [
    value: boolean,
    setValue: Dispatch<SetStateAction<boolean>>
  ];
  
  // 2. Create context with an explicit “undefined” default
  const SharedStateContext = createContext<SharedStateContextType | undefined>(undefined);
  
  // 3. Provider component props
  interface SharedStateProviderProps {
    children: ReactNode;
  }
  
  // 4. The Provider
  export function SharedBetProvider({ children }: SharedStateProviderProps) {
    const [isBetAdded, setIsBetAdded] = useState<boolean>(false);
    return (
      <SharedStateContext.Provider value={[isBetAdded, setIsBetAdded]}>
        {children}
      </SharedStateContext.Provider>
    );
  }
  
  // 5. Custom hook to consume the context
  export function useBetState(): SharedStateContextType {
    const ctx = useContext(SharedStateContext);
    if (!ctx) {
      throw new Error('useSharedState must be used within a SharedStateProvider');
    }
    return ctx;
  }
  
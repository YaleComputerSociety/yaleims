import { createContext, useContext, useState, ReactNode } from 'react';

interface SignInContextType {
  open: boolean;
  setOpen: (value: boolean) => void;
};

const SignInContext = createContext<SignInContextType>({
  open: false,
  setOpen: () => {},   
});

export function SignInProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <SignInContext.Provider value={{ open, setOpen }}>
      {children}
    </SignInContext.Provider>
  );
}

export function useSignIn() {
  return useContext(SignInContext);
}

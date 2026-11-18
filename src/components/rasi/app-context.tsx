import { createContext, useContext } from "react";

export type RasiSession = {
  userId: string;
  email: string;
  fullName: string;
  roleId: string;
  permissions: string[];
};

type AppContextValue = {
  user: RasiSession;
  setUser: (user: RasiSession) => void;
};

export const RasiAppContext = createContext<AppContextValue | null>(null);

export function useRasiApp() {
  const value = useContext(RasiAppContext);
  if (!value) throw new Error("Rasi application context is unavailable");
  return value;
}
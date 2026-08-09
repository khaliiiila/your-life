"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

const BalanceContext = createContext<{ hidden: boolean; toggle: () => void }>({
  hidden: true,
  toggle: () => {},
});

export function BalanceVisibility({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);
  return (
    <BalanceContext.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>
      {children}
    </BalanceContext.Provider>
  );
}

function useHidden() {
  return useContext(BalanceContext).hidden;
}

export function MaskedAmount({ children, className = "" }: { children: ReactNode; className?: string }) {
  const hidden = useHidden();
  return <strong className={`${className}${hidden ? " masked" : ""}`}>{hidden ? "••••••••" : children}</strong>;
}

export function EyeToggle({ className = "" }: { className?: string }) {
  const { hidden, toggle } = useContext(BalanceContext);
  return (
    <button type="button" className={className} aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"} onClick={toggle}>
      {hidden ? <Eye size={18} /> : <EyeOff size={18} />}
    </button>
  );
}
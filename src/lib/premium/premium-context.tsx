"use client";

import { createContext, useContext, type ReactNode } from "react";
import { NOT_PRO, type Entitlement } from "./entitlement";

/**
 * Client-side Pro entitlement (PREM-00).
 *
 * Server components read `getViewerEntitlement()` / `getViewerProfile().isPro`
 * directly. Client subtrees that need Pro status — a live nudge in the session
 * panel, an inline lock on an interactive control — read it from this context.
 *
 * A server parent resolves the entitlement and passes it down:
 *
 *   const entitlement = await getViewerEntitlement();
 *   return <PremiumProvider entitlement={entitlement}><SessionPanel /></PremiumProvider>;
 */

const PremiumContext = createContext<Entitlement>(NOT_PRO);

export function PremiumProvider({
  entitlement,
  children,
}: {
  entitlement: Entitlement;
  children: ReactNode;
}) {
  return (
    <PremiumContext.Provider value={entitlement}>
      {children}
    </PremiumContext.Provider>
  );
}

/**
 * Pro status for the nearest {@link PremiumProvider}. Defaults to locked
 * ({@link NOT_PRO}) when no provider is present, so a missing provider fails safe.
 */
export function usePro(): Entitlement {
  return useContext(PremiumContext);
}

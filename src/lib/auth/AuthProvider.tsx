"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "./client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider authClient={authClient} redirectTo="/">
      {children}
    </NeonAuthUIProvider>
  );
}

"use client";

import { createContext, useContext } from "react";
import type { UserRole } from "@magaza/shared";
import { isAdminRole } from "@magaza/shared";

const RoleContext = createContext<UserRole>("STORE");

export function RoleProvider({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useUserRole() {
  return useContext(RoleContext);
}

export function useIsStrictAdmin() {
  return isAdminRole(useUserRole());
}

/**
 * useActiveOSCompany — Sovereign Switcher store.
 *
 * Lightweight Zustand singleton tracking which Salsabil OS civilization
 * is currently in focus inside the AdminShell. The selection drives:
 *  • Sidebar / BottomNav swap (motherboard vs ERP).
 *  • Theme tenant id (via the bridge in __root).
 *  • Live workspace context (only when the company exposes a `workspaceKind`).
 *
 * Persists in localStorage so the choice survives reloads.
 */
import { create } from "zustand";
import { OS_COMPANIES, type OSCompanyId } from "@/core/identity/osCompanies";

const STORAGE_KEY = "salsabil_active_os_company";
const DEFAULT_ID: OSCompanyId = "reef";

function readStored(): OSCompanyId {
  if (typeof window === "undefined") return DEFAULT_ID;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && OS_COMPANIES.some((c) => c.id === v)) return v as OSCompanyId;
  } catch {
    /* noop */
  }
  return DEFAULT_ID;
}

interface OSCompanyState {
  activeId: OSCompanyId;
  setActive: (id: OSCompanyId) => void;
}

export const useActiveOSCompany = create<OSCompanyState>((set) => ({
  activeId: readStored(),
  setActive: (id: OSCompanyId) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* noop */
      }
    }
    set({ activeId: id });
  },
}));

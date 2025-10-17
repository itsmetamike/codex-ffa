"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { ParsedBrief } from "@/lib/schemas";

interface SessionData {
  id: string;
  brief?: string;
  parsedBrief?: ParsedBrief;
  vectorStoreId?: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}

interface SessionContextType {
  session: SessionData | null;
  isLoading: boolean;
  createSession: () => Promise<string>;
  updateSession: (updates: Partial<Omit<SessionData, "id" | "createdAt" | "updatedAt">>) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSessionFromStorage = async () => {
      const sessionId = localStorage.getItem("codex-session-id");
      if (sessionId) {
        try {
          await loadSession(sessionId);
        } catch (error) {
          console.error("Failed to load session:", error);
          localStorage.removeItem("codex-session-id");
        }
      }
      setIsLoading(false);
    };

    loadSessionFromStorage();
  }, []);

  const createSession = async (): Promise<string> => {
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      setSession(data.session);
      localStorage.setItem("codex-session-id", data.session.id);
      return data.session.id;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  };

  const updateSession = async (updates: Partial<Omit<SessionData, "id" | "createdAt" | "updatedAt">>) => {
    if (!session) {
      throw new Error("No active session");
    }

    try {
      const response = await fetch("/api/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          ...updates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update session");
      }

      setSession(data.session);
    } catch (error) {
      console.error("Error updating session:", error);
      throw error;
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/session?sessionId=${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load session");
      }

      setSession(data.session);
      localStorage.setItem("codex-session-id", sessionId);
    } catch (error) {
      console.error("Error loading session:", error);
      throw error;
    }
  };

  const clearSession = () => {
    setSession(null);
    localStorage.removeItem("codex-session-id");
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        isLoading,
        createSession,
        updateSession,
        loadSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

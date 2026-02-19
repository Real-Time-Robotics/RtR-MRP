"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { Language, LanguageContextType } from "./types";
import enTranslations from "./locales/en.json";
import viTranslations from "./locales/vi.json";

export type { Language };

const translations: Record<Language, Record<string, string>> = {
  en: enTranslations,
  vi: viTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate on mount - read from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("language") as Language;
    if (saved && (saved === "en" || saved === "vi")) {
      setLanguageState(saved);
    }
    setIsHydrated(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  }, []);

  // Use the actual language for translation after hydration
  const currentLanguage = isHydrated ? language : "en";

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let text = translations[currentLanguage][key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), value);
      });
    }
    return text;
  }, [currentLanguage]);

  const contextValue = {
    language: currentLanguage,
    setLanguage,
    t,
    isHydrated,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

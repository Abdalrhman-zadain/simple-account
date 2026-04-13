"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "ar";

interface SettingsState {
    language: Language;
    setLanguage: (lang: Language) => void;
    isHydrated: boolean;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("en");
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("app_language") as Language;
        if (stored === "ar" || stored === "en") {
            setLanguage(stored);
        } else {
            // Basic guess based on browser
            if (window.navigator.language.startsWith("ar")) {
                setLanguage("ar");
            }
        }
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        localStorage.setItem("app_language", language);
        document.documentElement.lang = language;
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    }, [language, isHydrated]);

    return (
        <SettingsContext.Provider value={{ language, setLanguage, isHydrated }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within SettingsProvider");
    }
    return context;
}

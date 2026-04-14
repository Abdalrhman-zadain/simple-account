"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "ar";

interface SettingsState {
    language: Language;
    setLanguage: (lang: Language) => void;
    isHydrated: boolean;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export function SettingsProvider({
    children,
    initialLanguage,
}: {
    children: React.ReactNode;
    initialLanguage: Language;
}) {
    const [language, setLanguage] = useState<Language>(initialLanguage);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        let nextLanguage = initialLanguage;
        const stored = localStorage.getItem("app_language") as Language;
        if (stored === "ar" || stored === "en") {
            nextLanguage = stored;
        } else {
            nextLanguage = window.navigator.language.startsWith("ar") ? "ar" : initialLanguage;
        }

        document.documentElement.lang = nextLanguage;
        document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";

        setLanguage(nextLanguage);

        setIsHydrated(true);
    }, [initialLanguage]);

    useEffect(() => {
        if (!isHydrated) return;
        localStorage.setItem("app_language", language);
        document.documentElement.lang = language;
        document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
        document.cookie = `app_language=${language}; path=/; max-age=31536000; samesite=lax`;
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

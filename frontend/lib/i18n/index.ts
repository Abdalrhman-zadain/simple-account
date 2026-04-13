"use client";

import { useSettings } from "@/providers/settings-provider";

export const translations = {
    en: {
        "app.title": "Genius ERP",
        "app.subtitle": "General Ledger",
        "nav.group.ledger": "Ledger",
        "nav.group.setup": "Setup",
        "nav.group.control": "Control",
        "nav.group.system": "System",
        "nav.item.chartOfAccounts": "Chart of Accounts",
        "nav.item.journalEntries": "Journal Entries",
        "nav.item.generalLedger": "General Ledger",
        "nav.item.masterData": "Master Data",
        "nav.item.fiscalPeriods": "Fiscal Periods",
        "nav.item.auditTrail": "Audit Trail",
        "nav.item.settings": "Settings",

        "settings.title": "System Settings",
        "settings.globalPreferences": "Global Preferences",
        "settings.displayLanguage": "Display Language",
        "settings.english": "English (LTR)",
        "settings.arabic": "العربية (RTL)",
        "settings.note": "Note: Changing the language updates the layout direction (LTR/RTL) immediately. Future parts of the system can easily adopt this using the translation function."
    },
    ar: {
        "app.title": "نظام العبقري ERP",
        "app.subtitle": "دفتر الأستاذ العام",
        "nav.group.ledger": "الدفاتر المحاسبية",
        "nav.group.setup": "الإعدادات الأساسية",
        "nav.group.control": "الرقابة والمراجعة",
        "nav.group.system": "النظام",
        "nav.item.chartOfAccounts": "دليل الحسابات",
        "nav.item.journalEntries": "قيود اليومية",
        "nav.item.generalLedger": "دفتر الأستاذ العام",
        "nav.item.masterData": "البيانات الأساسية",
        "nav.item.fiscalPeriods": "الفترات المالية",
        "nav.item.auditTrail": "مسار التدقيق",
        "nav.item.settings": "الإعدادات",

        "settings.title": "إعدادات النظام",
        "settings.globalPreferences": "التفضيلات العامة",
        "settings.displayLanguage": "لغة العرض واجهة المستخدم",
        "settings.english": "English (LTR)",
        "settings.arabic": "العربية (RTL)",
        "settings.note": "ملاحظة: تغيير اللغة يغير اتجاه واجهة المستخدم فوراً (يمين-يسار/يسار-يمين). يمكن استخدام أداة الترجمة لترجمة بقية المكونات مستقبلاً."
    }
} as const;

export type TranslationKey = keyof typeof translations.en;

export function useTranslation() {
    const { language } = useSettings();

    const t = (key: TranslationKey): string => {
        return translations[language]?.[key] || translations.en[key] || key;
    };

    return { t, language };
}

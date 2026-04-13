"use client";

import { useSettings } from "@/providers/settings-provider";
import { useTranslation } from "@/lib/i18n";

export function SettingsPage() {
    const { language, setLanguage } = useSettings();
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-2xl">
                <h2 className="text-lg font-medium mb-4">{t("settings.globalPreferences")}</h2>

                <div className="space-y-6">
                    <div>
                        <div className="mb-2 font-medium text-sm text-gray-700">{t("settings.displayLanguage")}</div>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer border border-gray-200 p-3 rounded-lg hover:bg-gray-50 flex-1">
                                <input
                                    type="radio"
                                    name="language"
                                    value="en"
                                    checked={language === 'en'}
                                    onChange={() => setLanguage('en')}
                                    className="text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm font-medium">{t("settings.english")}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer border border-gray-200 p-3 rounded-lg hover:bg-gray-50 flex-1">
                                <input
                                    type="radio"
                                    name="language"
                                    value="ar"
                                    checked={language === 'ar'}
                                    onChange={() => setLanguage('ar')}
                                    className="text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm font-medium">{t("settings.arabic")}</span>
                            </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {t("settings.note")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

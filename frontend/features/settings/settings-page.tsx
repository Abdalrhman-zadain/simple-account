"use client";

import { Card, SectionHeading } from "@/components/ui";
import { useSettings } from "@/providers/settings-provider";
import { useTranslation } from "@/lib/i18n";

export function SettingsPage() {
    const { language, setLanguage } = useSettings();
    const { t } = useTranslation();

    return (
        <div className="space-y-12 animate-in fade-in duration-300">
            <SectionHeading
                title={t("settings.title")}
                description={t("settings.globalPreferences")}
            />

            <Card className="max-w-3xl">
                <div className="space-y-8">
                    <div>
                        <div className="mb-4 font-bold text-lg text-gray-900">{t("settings.displayLanguage")}</div>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <label className="flex items-center gap-4 cursor-pointer border-2 border-gray-100 p-6 rounded-2xl hover:border-teal-400 hover:bg-teal-50/10 transition-all flex-1">
                                <input
                                    type="radio"
                                    name="language"
                                    value="en"
                                    checked={language === 'en'}
                                    onChange={() => setLanguage('en')}
                                    className="text-teal-500 focus:ring-teal-500 h-5 w-5"
                                />
                                <span className="text-base font-bold text-gray-900">{t("settings.english")}</span>
                            </label>
                            <label className="flex items-center gap-4 cursor-pointer border-2 border-gray-100 p-6 rounded-2xl hover:border-teal-400 hover:bg-teal-50/10 transition-all flex-1">
                                <input
                                    type="radio"
                                    name="language"
                                    value="ar"
                                    checked={language === 'ar'}
                                    onChange={() => setLanguage('ar')}
                                    className="text-teal-500 focus:ring-teal-500 h-5 w-5"
                                />
                                <span className="text-base font-bold text-gray-900">{t("settings.arabic")}</span>
                            </label>
                        </div>
                        <p className="text-sm text-gray-500 mt-6 leading-relaxed">
                            {t("settings.note")}
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

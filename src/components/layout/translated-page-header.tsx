"use client";

import { useLanguage } from "@/lib/i18n/language-context";

interface TranslatedPageHeaderProps {
  titleKey: string;
  descriptionKey: string;
  actions?: React.ReactNode;
}

export function TranslatedPageHeader({
  titleKey,
  descriptionKey,
  actions,
}: TranslatedPageHeaderProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t(titleKey)}</h1>
        <p className="text-muted-foreground">{t(descriptionKey)}</p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;

    const query: Record<string, any> = {};
    searchParams?.forEach((value, key) => {
      query[key] = value;
    });

    router.replace({ pathname, query }, { locale: newLocale });
    router.refresh();
  };

  return (
    <Select value={locale} onValueChange={switchLocale}>
      <SelectTrigger className="w-17.5 h-8! px-3">
        <SelectValue placeholder="Select language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">EN</SelectItem>
        <SelectItem value="hi">HI</SelectItem>
        <SelectItem value="ta">TA</SelectItem>
      </SelectContent>
    </Select>
  );
}

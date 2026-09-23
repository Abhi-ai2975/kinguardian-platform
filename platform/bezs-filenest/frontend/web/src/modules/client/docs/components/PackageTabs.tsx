/**
 * PackageTabs — tabbed package manager command switcher for MDX code examples.
 *
 * Renders installation commands for npm/pnpm/yarn (JS) or pip/uv (Python).
 * Set python prop to switch to the Python package manager set.
 *
 * Usage in MDX: <PackageTabs pkg="@filenest/node" />
 *               <PackageTabs pkg="filenest" python />
 *
 * @module
 */
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "./CopyButton";

interface PackageTabsProps {
  pkg: string;
  python?: boolean;
}

export function PackageTabs({ pkg, python = false }: PackageTabsProps) {
  if (python) {
    const tabs = [
      { id: "pip", label: "pip", cmd: `pip install ${pkg}` },
      { id: "uv", label: "uv", cmd: `uv add ${pkg}` },
      { id: "poetry", label: "poetry", cmd: `poetry add ${pkg}` },
    ];
    return <CommandTabs tabs={tabs} />;
  }

  const tabs = [
    { id: "pnpm", label: "pnpm", cmd: `pnpm add ${pkg}` },
    { id: "npm", label: "npm", cmd: `npm install ${pkg}` },
    { id: "yarn", label: "yarn", cmd: `yarn add ${pkg}` },
  ];
  return <CommandTabs tabs={tabs} />;
}

function CommandTabs({
  tabs,
}: {
  tabs: { id: string; label: string; cmd: string }[];
}) {
  return (
    <Tabs defaultValue={tabs[0].id} className="my-4">
      <TabsList className="h-8 rounded-b-none rounded-t-md border border-b-0 bg-muted/60 px-1">
        {tabs.map((t) => (
          <TabsTrigger
            key={t.id}
            value={t.id}
            className="h-6 rounded-sm px-2 text-xs data-[state=active]:bg-background"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="mt-0">
          <div className="group relative flex items-center justify-between rounded-b-md rounded-tr-md border bg-muted/40 px-4 py-3">
            <code className="text-sm font-mono">{t.cmd}</code>
            <CopyButton text={t.cmd} className="opacity-0 group-hover:opacity-100" />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

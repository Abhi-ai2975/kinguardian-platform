import { requireRole } from "@/modules/server/shared/auth/require-role";
import { getPreferenceTemplatesAction } from "@/modules/server/presentation/actions/admin";
import PreferenceTemplatesTable from "@/modules/client/admin/components/preference-templates/PreferenceTemplatesTable";

async function PreferenceTemplatesPage() {
  await requireRole(["superadmin"]);

  const [templates, error] = await getPreferenceTemplatesAction();

  return (
    <div className="space-y-8 w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Preference Templates</h1>
        <p className="text-sm text-muted-foreground">
          Manage default locale settings. One Global template and up to one
          template per country are supported.
        </p>
      </div>

      <PreferenceTemplatesTable
        templates={templates ?? null}
        error={error ?? null}
      />
    </div>
  );
}

export default PreferenceTemplatesPage;

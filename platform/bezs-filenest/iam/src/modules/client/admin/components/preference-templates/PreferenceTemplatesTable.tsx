"use client";

import { EmptyState } from "@/modules/client/shared/components/EmptyState";
import { AlertTriangle, LayoutTemplate, Plus } from "lucide-react";
import DataTable from "@/modules/client/shared/components/table/data-table";
import { IPreferenceTemplatesTableProps } from "../../types/preference-template.type";
import { useAdminStore } from "../../stores/admin.store";
import { preferenceTemplatesTableColumn } from "./PreferenceTemplatesTableColumn";

function PreferenceTemplatesTable({
  templates,
  error,
}: IPreferenceTemplatesTableProps) {
  const openModal = useAdminStore((state) => state.onOpen);

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="text-destructive" />}
        title="An Unexpected Error Occurred!"
        description={error.message || "Please try again later."}
        error={error}
      />
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <EmptyState
        icon={<LayoutTemplate />}
        title="No Preference Templates"
        description="Create a Global or Country-specific template to seed user preferences."
        buttonLabel="Add Template"
        buttonIcon={<Plus />}
        buttonOnClick={() => openModal({ type: "createPreferenceTemplate" })}
      />
    );
  }

  return (
    <DataTable
      columns={preferenceTemplatesTableColumn()}
      data={templates}
      dataSize={templates.length}
      label="Template"
      addLabelName="Add Template"
      searchField="scope"
      fallbackText="No Templates Found"
      openModal={() => openModal({ type: "createPreferenceTemplate" })}
    />
  );
}

export default PreferenceTemplatesTable;

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, ChevronsUpDown, ChevronUp, X } from "lucide-react";

type DataProps = {
  label: string;
  isSorted: false | "asc" | "desc";
  column: any;
};

export const TanstackTableColumnSorting = ({
  label,
  isSorted,
  column,
}: DataProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-0.5">
        {label}
        {isSorted === "asc" ? (
          <ChevronUp className="inline-block h-4 w-4 text-zinc-400" />
        ) : isSorted === "desc" ? (
          <ChevronDown className="inline-block h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronsUpDown className="inline-block h-4 w-4 text-zinc-400" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={10}>
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <ChevronUp /> Asc{" "}
          {isSorted === "asc" && <Check className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <ChevronDown /> Desc{" "}
          {isSorted === "desc" && <Check className="ml-auto" />}
        </DropdownMenuItem>
        {(isSorted === "asc" || isSorted === "desc") && (
          <DropdownMenuItem onClick={() => column.clearSorting()}>
            <X /> Reset
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

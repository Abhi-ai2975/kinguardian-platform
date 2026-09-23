import { redirect } from "next/navigation";

// Root → redirect to the tasks page.
export default function RootPage() {
  redirect("/tasks");
}

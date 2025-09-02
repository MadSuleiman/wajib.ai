import { redirect } from "next/navigation";

export default function WatchPage() {
  // Redirect legacy route to unified dashboard with the appropriate view
  redirect("/dashboard?view=watch");
}

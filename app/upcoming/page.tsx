import { AppNav } from "@/components/app-nav";
import { UpcomingWorkspace } from "./upcoming-workspace";

export const dynamic = "force-dynamic";

export default function UpcomingPage() {
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><UpcomingWorkspace /></main></div>;
}

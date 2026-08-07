import { AppNav } from "@/components/app-nav";
import { DebtsWorkspace } from "./debts-workspace";

export const dynamic = "force-dynamic";

export default function DebtsPage() {
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><DebtsWorkspace /></main></div>;
}

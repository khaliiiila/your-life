import { AppNav } from "@/components/app-nav";
import { TransactionsWorkspace } from "./transactions-workspace";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><TransactionsWorkspace /></main></div>;
}

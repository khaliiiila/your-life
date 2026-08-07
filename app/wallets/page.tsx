import { AppNav } from "@/components/app-nav";
import { WalletsWorkspace } from "./wallets-workspace";

export const dynamic = "force-dynamic";

export default function WalletsPage() {
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><WalletsWorkspace /></main></div>;
}

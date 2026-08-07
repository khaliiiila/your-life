import { AppNav } from "@/components/app-nav";
import { AssetsWorkspace } from "./assets-workspace";

export const dynamic = "force-dynamic";

export default function AssetsPage() {
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><AssetsWorkspace /></main></div>;
}

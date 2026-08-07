import { AppNav } from "@/components/app-nav";
import { WishlistsWorkspace } from "./wishlists-workspace";

export const dynamic = "force-dynamic";

export default function WishlistsPage() {
  return <div className="app-shell"><AppNav /><main className="main" id="main-content"><WishlistsWorkspace /></main></div>;
}

import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav.jsx";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto max-w-[480px] min-h-screen flex flex-col">
        <main className="flex-1 pb-20">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

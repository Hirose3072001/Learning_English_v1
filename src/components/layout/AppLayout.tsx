import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />
      <main className="mx-auto max-w-lg px-4 pt-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

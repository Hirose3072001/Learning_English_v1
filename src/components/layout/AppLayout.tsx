import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { AITutorModal } from "@/components/learn/AITutorModal";
import { cn } from "@/lib/utils";

export const AppLayout = () => {
  const location = useLocation();
  const isLessonRoute = location.pathname.startsWith("/lesson/");
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isGameRoute = location.pathname.startsWith("/game/");

  return (
    <div className={cn("min-h-screen bg-background", !isLessonRoute && "pb-20")}>
      {!isLessonRoute && <TopBar />}

      <main
        className={cn(
          "mx-auto",
          isLessonRoute ? "max-w-none p-0" : isGameRoute ? "max-w-2xl px-0 pt-16" : isAdminRoute ? "max-w-none px-4 pt-16" : "max-w-lg px-4 pt-16"
        )}
      >
        <Outlet />
      </main>

      {!isLessonRoute && <BottomNav />}
      
      {/* AI Tutor Assistant Floating Button */}
      <AITutorModal />
    </div>
  );
};


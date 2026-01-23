import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

export const AppLayout = () => {
  const location = useLocation();
  const isLessonRoute = location.pathname.startsWith("/lesson/");
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className={cn("min-h-screen bg-background", !isLessonRoute && "pb-20")}>
      {!isLessonRoute && <TopBar />}

      <main
        className={cn(
          "mx-auto",
          isLessonRoute ? "max-w-none p-0" : isAdminRoute ? "max-w-none px-4 pt-16" : "max-w-lg px-4 pt-16"
        )}
      >
        <Outlet />
      </main>

      {!isLessonRoute && <BottomNav />}
    </div>
  );
};


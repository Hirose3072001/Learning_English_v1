import { NavLink } from "react-router-dom";
import { BookOpen, Trophy, Target, User, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/learn", icon: BookOpen, label: "Học" },
  { to: "/flashcards", icon: Layers, label: "Flashcard" },
  { to: "/leaderboard", icon: Trophy, label: "Xếp hạng" },
  { to: "/quests", icon: Target, label: "Nhiệm vụ" },
  { to: "/profile", icon: User, label: "Hồ sơ" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-card">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "size-6 transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-xs font-semibold">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

import { Flame, Gem, Heart } from "lucide-react";

export const TopBar = () => {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b-2 border-border bg-card">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <Flame className="size-6 text-warning" fill="currentColor" />
          <span className="text-lg font-bold text-warning">0</span>
        </div>

        {/* Gems */}
        <div className="flex items-center gap-1.5">
          <Gem className="size-6 text-secondary" fill="currentColor" />
          <span className="text-lg font-bold text-secondary">500</span>
        </div>

        {/* Hearts */}
        <div className="flex items-center gap-1.5">
          <Heart className="size-6 text-destructive" fill="currentColor" />
          <span className="text-lg font-bold text-destructive">5</span>
        </div>
      </div>
    </header>
  );
};

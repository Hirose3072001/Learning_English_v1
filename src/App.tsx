import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Session } from "@supabase/supabase-js";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Learn from "./pages/Learn";
import Lesson from "./pages/Lesson";
import Alphabet from "./pages/Alphabet";
import Flashcards from "./pages/Flashcards";
import Leaderboard from "./pages/Leaderboard";
import Quests from "./pages/Quests";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Game from "./pages/Game";
import WordDefense from "./pages/WordDefense";
import SuperSlime from "./pages/SuperSlime";
import NotFound from "./pages/NotFound";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";

// Layout
import { AppLayout } from "./components/layout/AppLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/learn",
        element: <Learn />,
      },
      {
        path: "/lesson/:lessonId",
        element: <Lesson />,
      },
      {
        path: "/lesson/:lessonId/flashcards",
        element: <Flashcards />,
      },
      {
        path: "/game",
        element: <Game />,
      },
      {
        path: "/game/word-defense",
        element: <WordDefense />,
      },
      {
        path: "/game/super-slime",
        element: <SuperSlime />,
      },
      {
        path: "/leaderboard",
        element: <Leaderboard />,
      },
      {
        path: "/quests",
        element: <Quests />,
      },
      {
        path: "/profile",
        element: <Profile />,
      },
      {
        path: "/admin",
        element: <Admin />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

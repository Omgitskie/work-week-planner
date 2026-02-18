import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppProvider } from "@/context/AppContext";
import LoginPage from "@/pages/LoginPage";
import StaffBooking from "@/pages/StaffBooking";
import Layout from "@/components/Layout";
import CalendarView from "@/pages/CalendarView";
import SummaryView from "@/pages/SummaryView";
import BookTimeOff from "@/pages/BookTimeOff";
import EmployeeManager from "@/pages/EmployeeManager";
import HolidayRequests from "@/pages/HolidayRequests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  // Staff users see only the booking page
  if (role === 'staff') return <StaffBooking />;

  // Admin users see the full app
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CalendarView />} />
            <Route path="/summary" element={<SummaryView />} />
            <Route path="/book" element={<BookTimeOff />} />
            <Route path="/employees" element={<EmployeeManager />} />
            <Route path="/requests" element={<HolidayRequests />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import Mappings from "./pages/Mappings";
import Ingestions from "./pages/Ingestions";
import Runs from "./pages/Runs";
import Preview from "./pages/Preview";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Performance from "./pages/Performance";
import RulesPage from "./pages/Rules";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="mappings" element={<Mappings />} />
            <Route path="ingestions" element={<Ingestions />} />
            <Route path="runs" element={<Runs />} />
            <Route path="preview" element={<Preview />} />
            <Route path="performance" element={<Performance />} />
            <Route path="rules" element={<RulesPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import AreaCliente from "./pages/AreaCliente";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import PDV from "./pages/PDV";
import Clients from "./pages/Clients";
import Services from "./pages/Services";
import Products from "./pages/Products";
import Barbers from "./pages/Barbers";
import Appointments from "./pages/Appointments";
import NotFound from "./pages/NotFound";
import Financials from "./pages/Financials";

const queryClient = new QueryClient();

const App = () => (
  <div className="dark min-h-screen bg-background text-foreground transition-colors duration-300">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/areacliente" element={<AreaCliente />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/services" element={<Services />} />
            <Route path="/products" element={<Products />} />
            <Route path="/barbers" element={<Barbers />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/financials" element={<Financials />} />
            {/* catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </div>
  
);

export default App;

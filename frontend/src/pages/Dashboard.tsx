import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integration/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LogOut,
  Users,
  Scissors,
  ShoppingBag,
  Calendar,
  DollarSign,
  CreditCard,
  Package,
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    clients: 0,
    appointments: 0,
    todaySales: 0,
    products: 0,
  });

  useEffect(() => {
    checkUser();
    loadStats();
  }, []);

  // Realtime updates for stats
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => loadStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients' },
        () => loadStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => loadStats()
      ).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    if (session.user.user_metadata?.role === 'client') {
      navigate("/areacliente");
      return;
    }

    setUser(session.user);
  };

  const loadStats = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [clients, appointments, sales, products] = await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }),

      // ✅ Filtra apenas agendamentos de hoje e que NÃO estão finalizados/cancelados/concluídos
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", today)
        .not("status", "in", '("finalized","completed","cancelled")'),

      supabase.from("sales").select("total").gte("created_at", today),
      supabase.from("products").select("*", { count: "exact", head: true }),
    ]);

    const todaySalesTotal =
      sales.data?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;

    setStats({
      clients: clients.count || 0,
      appointments: appointments.count || 0,
      todaySales: todaySalesTotal,
      products: products.count || 0,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const menuItems = [
    { icon: ShoppingBag, label: "PDV", path: "/pdv", color: "bg-secondary" },
    { icon: Calendar, label: "Agendamentos", path: "/appointments", color: "bg-secondary" },
    { icon: Users, label: "Clientes", path: "/clients", color: "bg-secondary" },
    { icon: Scissors, label: "Serviços", path: "/services", color: "bg-muted" },
    { icon: Package, label: "Produtos", path: "/products", color: "bg-secondary" },
    { icon: Users, label: "Barbeiros", path: "/barbers", color: "bg-secondary" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <header className="bg-card border-b border-border shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Barber ERP</h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="p-6 bg-gradient-to-br from-card to-secondary border-border cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/financials')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                <p className="text-2xl font-bold text-green-500">
                  R$ {stats.todaySales.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-secondary border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos Hoje</p>
                <p className="text-2xl font-bold text-accent">{stats.appointments}</p>
              </div>
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-secondary border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold text-foreground">{stats.clients}</p>
              </div>
              <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-foreground" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-secondary border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produtos</p>
                <p className="text-2xl font-bold text-foreground">{stats.products}</p>
              </div>
              <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-foreground" />
              </div>
            </div>
          </Card>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-4">Menu Principal</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {menuItems.map((item) => (
            <Card
              key={item.path}
              className="p-6 cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-card border-border"
              onClick={() => navigate(item.path)}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className={`w-14 h-14 ${item.color} rounded-full flex items-center justify-center`}>
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="font-semibold text-foreground">{item.label}</span>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
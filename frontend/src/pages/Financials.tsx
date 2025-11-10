import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integration/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign, ShoppingCart, User, Tag } from "lucide-react";
import { format, startOfMonth, endOfMonth, getYear, getMonth, setYear, setMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const Financials = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const currentYear = getYear(new Date());
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(currentYear, i), "MMMM", { locale: ptBR }),
  }));

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);

      const startDate = startOfMonth(selectedDate).toISOString();
      const endDate = endOfMonth(selectedDate).toISOString();

      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          clients (name),
          barbers (name),
          sale_items (
            *,
            products (name),
            services (name)
          )
        `)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar vendas:", error);
      } else {
        setSales(data);
      }
      setLoading(false);
    };

    fetchSales();
  }, [selectedDate]);

  const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
  const numberOfSales = sales.length;

  const handleMonthChange = (month: string) => {
    setSelectedDate(current => setMonth(current, parseInt(month)));
  };

  const handleYearChange = (year: string) => {
    setSelectedDate(current => setYear(current, parseInt(year)));
  };

  const title = "Relatório Financeiro";
  const subtitle = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <header className="bg-card border-b border-border shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <Button onClick={() => navigate("/")} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
            <p className="text-muted-foreground capitalize">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Select value={getMonth(selectedDate).toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={getYear(selectedDate).toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">R$ {totalSales.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Número de Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{numberOfSales}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes das Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop View: Tabela */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horário</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/50">
                      <TableCell>{format(new Date(sale.created_at), "HH:mm")}</TableCell>
                      <TableCell>{sale.clients?.name || "Não identificado"}</TableCell>
                      <TableCell>{sale.sale_items.map((item: any) => item.products?.name || item.services?.name).join(', ')}</TableCell>
                      <TableCell className="text-right font-semibold text-green-500">R$ {sale.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View: Lista de Cards */}
            <div className="block md:hidden space-y-4">
              {sales.map((sale) => (
                <Card key={sale.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> {sale.clients?.name || "Não identificado"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(sale.created_at), "HH:mm")}</p>
                    </div>
                    <p className="text-lg font-bold text-green-500">R$ {sale.total.toFixed(2)}</p>
                  </div>
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm flex items-start gap-2"><Tag className="w-4 h-4 text-muted-foreground mt-1" /> {sale.sale_items.map((item: any) => item.products?.name || item.services?.name).join(', ')}</p>
                  </div>
                </Card>
              ))}
            </div>

            {loading && <p className="text-center p-4">Carregando...</p>}
            {!loading && sales.length === 0 && <p className="text-center p-4 text-muted-foreground">Nenhuma venda registrada neste período.</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Financials;
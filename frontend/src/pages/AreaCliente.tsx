import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integration/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Certifique-se de que CardContent e CardHeader também são usados se forem importados
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Adicionado DialogTrigger
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, addDays, setHours, setMinutes, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, LogOut, Plus, Scissors, CheckCircle, PartyPopper, CreditCard, Copy, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  payment_status?: string; // 👈 novo campo
  barbers: {
    id: string;
    name: string;
  } | null;
  services: {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
  } | null;
  client_id: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
}

type BookingStep = "service" | "barber" | "date" | "time" | "confirm" | "success";

const AreaCliente = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [pixCode, setPixCode] = useState("");

  useEffect(() => {
    const checkUserAndFetchAppointments = async () => {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Sessão não encontrada. Por favor, faça login.");
        navigate("/auth");
        return;
      }

      setUser(session.user);

      try {
        const { data: appointmentsData, error: appointmentsError } =
          await supabase
            .from("appointments")
            .select("*, barbers(id, name), services(id, name, price, duration_minutes)")
            .eq("client_id", session.user.id)
            .order("appointment_date", { ascending: false });

        if (appointmentsError) throw appointmentsError;

        const [servicesData, barbersData] = await Promise.all([
          supabase.from("services").select("*").eq("active", true).order("name"),
          supabase.from("barbers").select("*").eq("active", true).order("name"),
        ]);

        if (servicesData.error) throw servicesData.error;
        if (barbersData.error) throw barbersData.error;

        setServices(servicesData.data || []);
        setBarbers(barbersData.data || []);

        // 👇 Só mostra agendamentos não pagos
        setAppointments((appointmentsData || []).filter((a: Appointment) => a.payment_status !== "paid"));

      } catch (error: any) {
        console.error("Erro ao carregar dados:", error);
        toast.error(error.message || "Ocorreu um erro ao buscar seus agendamentos.");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchAppointments();
  }, [navigate]);

  // 🔥 Realtime — escuta mudanças na tabela appointments
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`public:appointments:client_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `client_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log("Realtime change received!", payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          setAppointments(currentAppointments => {
            if (eventType === 'INSERT') {
              return [newRecord as Appointment, ...currentAppointments];
            }
            if (eventType === 'UPDATE') {
              // 👇 Se o pagamento foi confirmado, remove da lista
              if (newRecord.payment_status === 'paid') {
                toast.success("Pagamento confirmado! O agendamento foi concluído.");
                return currentAppointments.filter((apt: Appointment) => apt.id !== newRecord.id);
              }
              return currentAppointments.map(apt =>
                apt.id === newRecord.id ? { ...apt, ...newRecord } as Appointment : apt
              );
            }
            if (eventType === 'DELETE') {
              return currentAppointments.filter(apt => apt.id !== oldRecord.id);
            }
            return currentAppointments;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Disponibilidade fake
  useEffect(() => {
    if (selectedDate && selectedBarber && selectedService) {
      const openingTime = 9;
      const closingTime = 18;
      const interval = selectedService.duration_minutes || 30;
      const times: string[] = [];
      for (let hour = openingTime; hour < closingTime; hour++) {
        times.push(`${String(hour).padStart(2, '0')}:00`);
        if (interval < 60) times.push(`${String(hour).padStart(2, '0')}:${interval}`);
      }
      setAvailableTimes(times);
    }
  }, [selectedDate, selectedBarber, selectedService]);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth");
  };

  const resetBooking = () => {
    setBookingStep("service");
    setSelectedService(null);
    setSelectedBarber(null);
    setSelectedDate(startOfDay(new Date()));
    setSelectedTime(null);
  };

  const handleFinalizeBooking = async () => {
    if (!user || !selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    const [hour, minute] = selectedTime.split(':').map(Number);
    const appointmentDateTime = setMinutes(setHours(selectedDate, hour), minute);

    try {
      const { error: appointmentError } = await supabase.from("appointments").insert({
        client_id: user.id,
        service_id: selectedService.id,
        barber_id: selectedBarber.id,
        appointment_date: appointmentDateTime.toISOString(),
        status: "scheduled",
        payment_status: "pending"
      });

      if (appointmentError) throw appointmentError;

      toast.success("Agendamento criado com sucesso!");
      setBookingStep("success");

      supabase
        .from("appointments")
        .select("*, barbers(id, name), services(id, name, price, duration_minutes)")
        .eq("client_id", user.id)
        .then(({ data }: { data: Appointment[] | null }) => setAppointments((data || []).filter((a: Appointment) => a.payment_status !== "paid")));

    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      toast.error(error.message || "Erro ao criar agendamento.");
    }
  };

  const handleAppointmentClick = async (apt: Appointment) => {
    if (apt.payment_status !== 'paid') {
      setSelectedAppointmentForPayment(apt);

      try {
        const total = apt.services?.price || 50;
        const descricao = apt.services?.name || "Serviço";

        const res = await fetch("https://backendbarber.up.railway.app/api/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ total, descricao }),
        });

        const data = await res.json();

        if (data.qrCode) {
          setPixCode(data.copiaECola);
          setIsPaymentOpen(true);
        } else {
          toast.error("Erro ao gerar pagamento no MercadoPago.");
        }

      } catch (error) {
        console.error(error);
        toast.error("Erro ao gerar pagamento no MercadoPago.");
      }
    }
  };

  const handleCopyPixCode = () => {
    if (!pixCode) {
      toast.error("Código PIX não disponível.");
      return;
    }

    try {
      // Cria textarea temporário
      const textArea = document.createElement("textarea");
      textArea.value = pixCode;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);

      // Seleciona o texto
      textArea.focus();
      textArea.select();

      // Executa comando copy
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        toast.success("Código PIX copiado para a área de transferência!");
      } else {
        toast.error("Não foi possível copiar o código PIX.");
      }
    } catch (err) {
      console.error("Erro ao copiar PIX:", err);
      toast.error("Erro ao copiar o código PIX.");
    }
  };



  const handleConfirmPayment = async () => {
    if (!selectedAppointmentForPayment || !selectedAppointmentForPayment.services) {
      toast.error("Agendamento inválido para pagamento.");
      return;
    }

    try {
      const { services: service, barbers: barber, client_id } = selectedAppointmentForPayment;
      const total = service.price;

      // 1. Criar a venda na tabela 'sales'
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          client_id: client_id,
          barber_id: barber?.id || null,
          total: total,
          discount: 0,
          payment_method: "pix",
          payment_status: "completed", // Marcando como completo, pois é uma simulação
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Criar o item da venda em 'sale_items'
      const { error: itemError } = await supabase.from("sale_items").insert({
        sale_id: sale.id,
        item_type: "service",
        service_id: service.id,
        quantity: 1,
        unit_price: total,
        total_price: total,
      });

      if (itemError) throw itemError;

      // 3. Atualizar o agendamento (isso já aciona o realtime para remover da lista)
      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({ payment_status: "paid" })
        .eq("id", selectedAppointmentForPayment.id);

      if (appointmentError) throw appointmentError;

      toast.success("Pagamento registrado com sucesso!");
      setIsPaymentOpen(false);

    } catch (error: any) {
      console.error("Erro ao confirmar pagamento:", error);
      toast.error(error.message || "Erro ao registrar o pagamento.");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      scheduled: { variant: "default", label: "Agendado" },
      completed: { variant: "success", label: "Concluído" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    const statusInfo = variants[status] || variants.scheduled;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* --- HEADER --- */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Área do Cliente</h1>
            <p className="text-muted-foreground">Gerencie seus agendamentos e pagamentos.</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Novo Agendamento</Button>
              </DialogTrigger>
            </Dialog>
            <Button onClick={handleLogout} variant="outline" size="sm" disabled={loading}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        {/* --- LISTAGEM DE AGENDAMENTOS --- */}
        <main className="grid lg:grid-cols-3 gap-8">
          <aside className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader className="flex-row items-center gap-4 space-y-0 pb-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  {loading ? <Skeleton className="w-10 h-10 rounded-full" /> : <User className="w-8 h-8 text-primary-foreground" />}
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-6 w-32" />
                  ) : (
                    <>
                      <h2 className="text-xl font-bold">{user?.user_metadata?.full_name || "Cliente"}</h2>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </>
                  )}
                </div>
              </CardHeader>
            </Card>
          </aside>

          <div className="md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Meus Agendamentos</h2>
            <div className="space-y-4">
              {loading ? (
                <Skeleton className="h-6 w-1/2" />
              ) : appointments.length > 0 ? (
                appointments.map((apt) => (
                  <Card
                    key={apt.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleAppointmentClick(apt)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Scissors className="w-5 h-5 text-primary" /> {apt.services?.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">com {apt.barbers?.name}</p>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {format(new Date(apt.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {apt.payment_status !== 'paid' && (
                        <div className="mt-3 flex justify-end">
                          <Button size="sm" onClick={() => handleAppointmentClick(apt)}>
                            <CreditCard className="w-4 h-4 mr-2" /> Pagar Agora
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="text-center py-8">
                  <CardContent>
                    <p>Nenhum agendamento pendente de pagamento.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        {/* --- MODAL DE AGENDAMENTO --- */}
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {bookingStep === "service" && (
                <div className="space-y-4">
                  <h3 className="font-semibold">1. Escolha o serviço</h3>
                  <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {services.map(s => (
                      <Card key={s.id} className="p-4 cursor-pointer hover:bg-muted" onClick={() => { setSelectedService(s); setBookingStep("barber"); }}>
                        <p className="font-bold">{s.name}</p>
                        <p className="text-sm text-primary">R$ {s.price.toFixed(2)}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {bookingStep === "barber" && (
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setBookingStep("service")}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                  <h3 className="font-semibold">2. Escolha o barbeiro</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {barbers.map(b => (
                      <Card key={b.id} className="p-4 cursor-pointer hover:bg-muted" onClick={() => { setSelectedBarber(b); setBookingStep("date"); }}>
                        <p className="font-bold">{b.name}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {bookingStep === "date" && (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBookingStep("barber")}
                    className="flex items-center gap-2 text-zinc-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </Button>

                  <h3 className="font-semibold text-center text-lg text-white">
                    3. Escolha a data
                  </h3>

                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => { if (date) { setSelectedDate(date); setBookingStep("time"); } }}
                      disabled={(date) => date < startOfDay(new Date()) || date > addDays(new Date(), 60)}
                      locale={ptBR}
                    />
                  </div>
                </div>
              )}

              {bookingStep === "time" && (
                <div className="space-y-4">
                  <Button variant="ghost" size="sm" onClick={() => setBookingStep("date")}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                  <h3 className="font-semibold">4. Escolha o horário</h3>
                  <p className="text-sm text-muted-foreground">{format(selectedDate!, "dd 'de' MMMM", { locale: ptBR })}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {availableTimes.map(time => (
                      <Button key={time} variant="outline" onClick={() => { setSelectedTime(time); setBookingStep("confirm"); }}>
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {bookingStep === "confirm" && (
                <div className="space-y-6">
                  <Button variant="ghost" size="sm" onClick={() => setBookingStep("time")}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                  <h3 className="font-semibold">5. Confirme seu agendamento</h3>
                  <Card className="p-4 bg-muted">
                    <p><strong>Serviço:</strong> {selectedService?.name}</p>
                    <p><strong>Barbeiro:</strong> {selectedBarber?.name}</p>
                    <p><strong>Data:</strong> {format(selectedDate!, "dd/MM/yyyy", { locale: ptBR })} às {selectedTime}</p>
                    <p className="text-lg font-bold text-primary mt-2">Total: R$ {selectedService?.price.toFixed(2)}</p>
                  </Card>
                  <Button className="w-full" onClick={handleFinalizeBooking}>Confirmar Agendamento</Button>
                </div>
              )}

              {bookingStep === "success" && (
                <div className="text-center space-y-4 py-8">
                  <PartyPopper className="w-16 h-16 text-green-500 mx-auto" />
                  <h3 className="text-2xl font-bold">Agendamento Confirmado!</h3>
                  <p className="text-muted-foreground">Seu horário foi reservado com sucesso. Você pode vê-lo na sua lista de agendamentos.</p>
                  <Button onClick={() => { setIsBookingOpen(false); resetBooking(); }}>Fechar</Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* --- MODAL DE PAGAMENTO --- */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl">Finalizar Pagamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p>Serviço: <strong>{selectedAppointmentForPayment?.services?.name}</strong></p>
                <p>Valor: <strong className="text-primary text-lg">R$ {selectedAppointmentForPayment?.services?.price.toFixed(2)}</strong></p>
              </div>
              <div className="bg-white p-4 rounded-lg flex justify-center">
                {pixCode ? <QRCode value={pixCode} size={220} /> : <p>Gerando QR Code...</p>}
              </div>

              <div>
                <Label>Código PIX Copia e Cola:</Label>
                <div className="mt-2 p-3 bg-muted rounded-lg flex items-center justify-between gap-2">
                  <p className="text-xs text-foreground break-all flex-1">{pixCode}</p>
                  <Button size="icon" variant="ghost" onClick={handleCopyPixCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button className="w-full" onClick={handleConfirmPayment}>
                <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Pagamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AreaCliente;

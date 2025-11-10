import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../integration/supabase/client";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge"; // This was correct, but I'm ensuring consistency.
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale"; // This is a library, so it doesn't use the '@' alias.

const Appointments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("scheduled");
  const [formData, setFormData] = useState({
    client_id: "",
    barber_id: "",
    service_id: "",
    appointment_date: "",
    status: "scheduled",
    notes: "",
  });

  const clientFromState = location.state?.clientId ? {
    id: location.state.clientId,
    name: location.state.clientName,
  } : null;

  useEffect(() => {
    loadInitialData();

    if (clientFromState) {
      setFormData(prev => ({ ...prev, client_id: clientFromState.id }));
      if (!clients.some(c => c.id === clientFromState.id)) {
        setClients(prev => [...prev, clientFromState]);
      }
    }
  }, []);

  const loadInitialData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    loadData(session.user);
  };


  const loadData = async (currentUser: any) => {
    let appointmentsQuery = supabase
      .from("appointments")
      .select("*, clients(*), services(*), barbers(*)")
      .order("appointment_date", { ascending: false });

    // Filter appointments for clients
    if (currentUser && currentUser.user_metadata?.role === 'client') {
      appointmentsQuery = appointmentsQuery.eq('client_id', currentUser.id);
    }

    const [appointmentsData, clientsData, servicesData, barbersData] = await Promise.all([
      appointmentsQuery,
      supabase.from("clients").select("*").order("name"),
      supabase.from("services").select("*").eq("active", true).order("name"),
      supabase.from("barbers").select("*").eq("active", true).order("name"),
    ]);

    if (appointmentsData.data) setAppointments(appointmentsData.data);
    if (clientsData.data) setClients(clientsData.data);
    if (servicesData.data) setServices(servicesData.data);
    if (barbersData.data) setBarbers(barbersData.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAppointment) {
        const { error } = await supabase
          .from("appointments")
          .update(formData)
          .eq("id", editingAppointment.id);

        if (error) throw error;
        toast.success("Agendamento atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("appointments").insert(formData);

        if (error) throw error;
        toast.success("Agendamento criado com sucesso!");
      }

      setIsDialogOpen(false);
      setEditingAppointment(null);
      setFormData({
        client_id: "",
        barber_id: "",
        service_id: "",
        appointment_date: "",
        status: "scheduled",
        notes: "",
      });
      loadData(user);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar agendamento");
    }
  };

  const handleEdit = (appointment: any) => {
    setEditingAppointment(appointment);
    setFormData({
      client_id: appointment.client_id || "",
      barber_id: appointment.barber_id || "",
      service_id: appointment.service_id || "",
      appointment_date: appointment.appointment_date?.split(".")[0] || "",
      status: appointment.status,
      notes: appointment.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este agendamento?")) return;

    try {
      const { error } = await supabase.from("appointments").delete().eq("id", id);

      if (error) throw error;
      toast.success("Agendamento excluído com sucesso!");
      loadData(user);
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir agendamento");
    }
  };

  const handleCompleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Agendamento finalizado com sucesso!");
      loadData(user);
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar agendamento");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      scheduled: { variant: "default", label: "Agendado" },
      completed: { variant: "success", label: "Concluído" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    const statusInfo = variants[status] || variants.scheduled;
    return <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>;
  };

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Calendar className="text-primary" />
            Agendamentos
          </h1>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingAppointment(null);
                setFormData({
                  client_id: "",
                  barber_id: "",
                  service_id: "",
                  appointment_date: "",
                  status: "scheduled",
                  notes: "",
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select
                    disabled={!!clientFromState}
                    required
                    value={formData.client_id} 
                    onValueChange={(value) =>
                      setFormData({ ...formData, client_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Barbeiro</Label>
                  <Select
                    value={formData.barber_id} 
                    onValueChange={(value) =>
                      setFormData({ ...formData, barber_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o barbeiro" />
                    </SelectTrigger>
                    <SelectContent>
                      {barbers.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Serviço</Label>
                  <Select
                    value={formData.service_id} 
                    onValueChange={(value) =>
                      setFormData({ ...formData, service_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data e Hora *</Label>
                  <Input
                    required
                    type="datetime-local"
                    value={formData.appointment_date} 
                    onChange={(e) =>
                      setFormData({ ...formData, appointment_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status} 
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Agendado</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input
                    value={formData.notes} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingAppointment ? "Atualizar" : "Criar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scheduled">Agendados</TabsTrigger>
            <TabsTrigger value="completed">Concluídos</TabsTrigger>
          </TabsList>
          <TabsContent value="scheduled">
            <div className="space-y-4 mt-4">
              {appointments.filter(a => a.status === 'scheduled').map((appointment) => (
                <Card key={appointment.id} className="p-6 border-border">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(appointment.status)}
                      </div>
                      <h3 className="font-bold text-lg text-foreground mb-1">
                        {appointment.clients?.name || "Cliente não especificado"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {appointment.services?.name || "Serviço não especificado"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Barbeiro: {appointment.barbers?.name || "Não especificado"}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-primary">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold">
                          {format(
                            new Date(appointment.appointment_date),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteAppointment(appointment.id)}
                      >
                        Finalizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(appointment)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(appointment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {appointments.filter(a => a.status === 'scheduled').length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Nenhum agendamento pendente.</div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="completed">
            <div className="space-y-4 mt-4">
              {appointments.filter(a => a.status === 'completed').map((appointment) => (
                <Card key={appointment.id} className="p-6 border-border opacity-70">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(appointment.status)}
                      </div>
                      <h3 className="font-bold text-lg text-foreground mb-1">
                        {appointment.clients?.name || "Cliente não especificado"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {appointment.services?.name || "Serviço não especificado"}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-primary">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold">
                          {format(
                            new Date(appointment.appointment_date),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {appointments.filter(a => a.status === 'completed').length === 0 && (
                <div className="text-center py-12 text-muted-foreground">Nenhum agendamento concluído hoje.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Appointments;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integration/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, Users } from "lucide-react";

const Barbers = () => {
  const navigate = useNavigate();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    commission_rate: "50",
    active: true,
  });

  useEffect(() => {
    checkAuth();
    loadBarbers();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar barbeiros");
      return;
    }

    setBarbers(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const barberData = {
        ...formData,
        commission_rate: parseFloat(formData.commission_rate),
      };

      if (editingBarber) {
        const { error } = await supabase
          .from("barbers")
          .update(barberData)
          .eq("id", editingBarber.id);

        if (error) throw error;
        toast.success("Barbeiro atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("barbers").insert(barberData);

        if (error) throw error;
        toast.success("Barbeiro cadastrado com sucesso!");
      }

      setIsDialogOpen(false);
      setEditingBarber(null);
      setFormData({ name: "", phone: "", commission_rate: "50", active: true });
      loadBarbers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar barbeiro");
    }
  };

  const handleEdit = (barber: any) => {
    setEditingBarber(barber);
    setFormData({
      name: barber.name,
      phone: barber.phone || "",
      commission_rate: barber.commission_rate?.toString() || "50",
      active: barber.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este barbeiro?")) return;

    try {
      const { error } = await supabase.from("barbers").delete().eq("id", id);

      if (error) throw error;
      toast.success("Barbeiro excluído com sucesso!");
      loadBarbers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir barbeiro");
    }
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
            <Users className="text-primary" />
            Barbeiros
          </h1>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingBarber(null);
                setFormData({ name: "", phone: "", commission_rate: "50", active: true });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Barbeiro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingBarber ? "Editar Barbeiro" : "Novo Barbeiro"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Comissão (%) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_rate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, commission_rate: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.active} 
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                  <Label>Ativo</Label>
                </div>
                <Button type="submit" className="w-full">
                  {editingBarber ? "Atualizar" : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <Card key={barber.id} className="p-6 border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg text-foreground">{barber.name}</h3>
                    {!barber.active && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        Inativo
                      </span>
                    )}
                  </div>
                  {barber.phone && (
                    <p className="text-sm text-muted-foreground mb-2">{barber.phone}</p>
                  )}
                  <p className="text-lg font-semibold text-primary">
                    Comissão: {Number(barber.commission_rate || 0).toFixed(1)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(barber)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(barber.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {barbers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum barbeiro cadastrado</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Barbers;
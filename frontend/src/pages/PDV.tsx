import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../integration/supabase/client";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, ShoppingCart, CreditCard, QrCode } from "lucide-react";
import QRCode from 'react-qr-code';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "service" | "product";
}

const PDV = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [discount, setDiscount] = useState(0);
  const [pixCode, setPixCode] = useState("");
  const [showPixDialog, setShowPixDialog] = useState(false);


  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    const [servicesData, productsData, clientsData, barbersData] = await Promise.all([
      supabase.from("services").select("*").eq("active", true),
      supabase.from("products").select("*").eq("active", true),
      supabase.from("clients").select("*"),
      supabase.from("barbers").select("*").eq("active", true),
    ]);

    if (servicesData.data) setServices(servicesData.data);
    if (productsData.data) setProducts(productsData.data);
    if (clientsData.data) setClients(clientsData.data);
    if (barbersData.data) setBarbers(barbersData.data);
  };

  const addToCart = (item: any, type: "service" | "product") => {
    const existingItem = cart.find((i) => i.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
          type,
        },
      ]);
    }
    toast.success(`${item.name} adicionado ao carrinho`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return subtotal - discount;
  };

  const generatePixPayment = async () => {
    const total = calculateTotal();

    const res = await fetch("https://backendbarber.up.railway.app/api/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total, descricao: "Corte de cabelo" }),
    });

    const data = await res.json();
    if (data.qrCode) {
      setPixCode(data.copiaECola);
      setShowPixDialog(true); // Correção: Abre o modal do Pix
    } else {
      toast.error("Erro ao gerar PIX: " + (data.error || "Resposta inválida do servidor.")); // Usando toast para consistência
    }
  };

  const finalizeSale = async (paymentMethod: string) => {
    if (cart.length === 0) {
      toast.error("Adicione itens ao carrinho");
      return;
    }

    try {
      const total = calculateTotal();

      // Criar a venda
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          client_id: selectedClient || null,
          barber_id: selectedBarber || null,
          total,
          discount,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "pix" ? "pending" : "completed",
          pix_qr_code: paymentMethod === "pix" ? pixCode : null,
          pix_copy_paste: paymentMethod === "pix" ? pixCode : null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Criar os itens da venda
      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
        item_type: item.type,
        service_id: item.type === "service" ? item.id : null,
        product_id: item.type === "product" ? item.id : null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Atualizar estoque de produtos
      for (const item of cart.filter((i) => i.type === "product")) {
        const product = products.find((p) => p.id === item.id);
        if (product) {
          await supabase
            .from("products")
            .update({ stock: product.stock - item.quantity })
            .eq("id", item.id);
        }
      }

      if (paymentMethod === "pix") {
        generatePixPayment();
      } else {
        toast.success("Venda finalizada com sucesso!");
        resetCart();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar venda");
    }
  };

  const resetCart = () => {
    setCart([]);
    setSelectedClient("");
    setSelectedBarber("");
    setDiscount(0);
    setShowPixDialog(false);
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
        <h1 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3">
          <ShoppingCart className="text-primary" />
          Ponto de Venda
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-6 border-border">
              <Tabs defaultValue="services">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="services">Serviços</TabsTrigger>
                  <TabsTrigger value="products">Produtos</TabsTrigger>
                </TabsList>

                <TabsContent value="services">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <Card
                        key={service.id}
                        className="p-4 cursor-pointer hover:shadow-lg transition-all border-border"
                        onClick={() => addToCart(service, "service")}
                      >
                        <h3 className="font-semibold text-foreground">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                        <p className="text-lg font-bold text-primary mt-2">
                          R$ {Number(service.price).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {service.duration_minutes} min
                        </p>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="products">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product) => (
                      <Card
                        key={product.id}
                        className="p-4 cursor-pointer hover:shadow-lg transition-all border-border"
                        onClick={() => addToCart(product, "product")}
                      >
                        <h3 className="font-semibold text-foreground">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                        <p className="text-lg font-bold text-primary mt-2">
                          R$ {Number(product.price).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Estoque: {product.stock}
                        </p>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div>
            <Card className="p-6 border-border sticky top-4">
              <h2 className="text-xl font-bold text-foreground mb-4">Carrinho</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <Label>Cliente</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
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
                  <Select value={selectedBarber} onValueChange={setSelectedBarber}>
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
              </div>

              <div className="space-y-2 mb-6 max-h-60 overflow-auto">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Carrinho vazio
                  </p>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateQuantity(item.id, parseInt(e.target.value) || 1)
                          }
                          className="w-16 h-8 text-center"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 mb-4">
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscount(parseFloat(e.target.value) || 0)} // Correção: Tipo do evento
                />
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold text-foreground">
                  <span>Total:</span>
                  <span className="text-primary">R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => finalizeSale("cash")}
                  disabled={cart.length === 0}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Finalizar - Dinheiro
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => finalizeSale("pix")}
                  disabled={cart.length === 0}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Finalizar - PIX
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showPixDialog} onOpenChange={setShowPixDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Pagamento PIX</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg flex justify-center">
              <QRCode value={pixCode} size={200} />
            </div>
            <div>
              <Label>Código Copia e Cola:</Label>
              <div className="mt-2 p-3 bg-secondary rounded-lg">
                <p className="text-xs text-foreground break-all">{pixCode}</p>
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>Escaneie o QR Code ou copie o código acima</p>
              <p className="font-bold text-primary mt-2">
                Total: R$ {calculateTotal().toFixed(2)}
              </p>
            </div>
            <Button className="w-full" onClick={resetCart}>
              Confirmar Pagamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PDV;
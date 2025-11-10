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
import { ArrowLeft, Plus, Edit, Trash2, Package, AlertTriangle } from "lucide-react";

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    cost: "",
    stock: "0",
    min_stock: "0",
    active: true,
  });

  useEffect(() => {
    checkAuth();
    loadProducts();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Erro ao carregar produtos");
      return;
    }

    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        stock: parseInt(formData.stock),
        min_stock: parseInt(formData.min_stock),
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("products").insert(productData);

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "", cost: "", stock: "0", min_stock: "0", active: true });
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar produto");
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      stock: product.stock.toString(),
      min_stock: product.min_stock.toString(),
      active: product.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este produto?")) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      toast.success("Produto excluído com sucesso!");
      loadProducts();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir produto");
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
            <Package className="text-primary" />
            Produtos
          </h1>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingProduct(null);
                setFormData({ name: "", description: "", price: "", cost: "", stock: "0", min_stock: "0", active: true });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preço Venda (R$) *</Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Custo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData({ ...formData, cost: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estoque *</Label>
                    <Input
                      required
                      type="number"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Estoque Mínimo *</Label>
                    <Input
                      required
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) =>
                        setFormData({ ...formData, min_stock: e.target.value })
                      }
                    />
                  </div>
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
                  {editingProduct ? "Atualizar" : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const lowStock = product.stock <= product.min_stock;
            return (
              <Card key={product.id} className="p-6 border-border">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-foreground">{product.name}</h3>
                      {!product.active && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          Inativo
                        </span>
                      )}
                      {lowStock && product.active && (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                    <p className="text-2xl font-bold text-primary">
                      R$ {Number(product.price).toFixed(2)}
                    </p>
                    {product.cost && (
                      <p className="text-sm text-muted-foreground">
                        Custo: R$ {Number(product.cost).toFixed(2)}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-sm font-semibold ${lowStock ? 'text-warning' : 'text-foreground'}`}>
                        Estoque: {product.stock}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (mín: {product.min_stock})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto cadastrado</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
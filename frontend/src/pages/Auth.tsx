import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integration/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Scissors } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");

        if (data.user?.user_metadata?.role === 'client') {
          navigate("/areacliente");
        } else {
          navigate("/");
        }
      } else {
        // New sign-ups will have the 'client' role to access the customer area.
        // 'admin' or 'barber' roles must be assigned manually in the Supabase dashboard.
        const role = "client";

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Signup completed but no user was returned.");

        // Create a corresponding client profile
        const { error: clientError } = await supabase.from("clients").insert({
          id: signUpData.user.id, // Link to the auth.users table
          name: fullName,
          email: email,
          phone: "", // Phone is required, provide an empty string if not collected
        });

        if (clientError) {
          // This is a tricky situation. The user is created in auth, but not in clients.
          // For now, we'll just log it and let the user sign in.
          // A more robust solution might involve a database trigger or cleanup function.
          console.error("Failed to create client profile:", clientError);
          toast.error("Ocorreu um erro ao criar seu perfil de cliente.");
        }

        toast.success("Cadastro realizado! Faça login para continuar.");
        setIsLogin(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Scissors className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Barber ERP</h1>
          <p className="text-muted-foreground">Sistema de Gestão para Barbearias</p>
        </div>

        <div className="bg-card rounded-xl shadow-2xl p-8 border border-border">
          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  placeholder="Seu nome completo"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Cadastrar"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
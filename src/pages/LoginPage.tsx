import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(login, password);
    if (error) {
      toast({ title: 'Erro', description: error, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetEmail.includes('@') ? resetEmail : `${resetEmail}@buenocontrole.app`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível enviar o email de recuperação.', variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Verifique seu email para redefinir a senha.' });
      setShowReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bueno</CardTitle>
          <CardDescription>Gestão de Engenharia — Faça login para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          {!showReset ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login">Usuário ou Email</Label>
                <Input id="login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="seu.usuario" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <button type="button" onClick={() => setShowReset(true)} className="w-full text-sm text-muted-foreground hover:text-primary transition-colors">
                Esqueceu a senha?
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Usuário ou Email</Label>
                <Input id="resetEmail" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="seu.usuario" required autoFocus />
              </div>
              <Button type="submit" className="w-full">Enviar link de recuperação</Button>
              <button type="button" onClick={() => setShowReset(false)} className="w-full text-sm text-muted-foreground hover:text-primary transition-colors">
                Voltar ao login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

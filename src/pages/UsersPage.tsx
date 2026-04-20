import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  active: boolean;
  role: string;
}

export default function UsersPage() {
  const { isAdmin, logAction } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<UserRow | null>(null);

  const [form, setForm] = useState({ username: '', full_name: '', password: '', role: 'admin' as string });

  const fetchUsers = useCallback(async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: roles } = await supabase.from('user_roles').select('*');
    if (profiles && roles) {
      const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
      setUsers(profiles.map((p: any) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        active: p.active,
        role: (roleMap.get(p.id) as string) || 'admin',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    const email = `${form.username}@buenocontrole.app`;
    // Call edge function to create user
    const { data, error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'create', email, password: form.password, username: form.username, full_name: form.full_name, role: form.role },
    });
    if (error || data?.error) {
      toast({ title: 'Erro', description: data?.error || 'Erro ao criar usuário', variant: 'destructive' });
      return;
    }
    await logAction('criar', 'usuario', data?.userId, { username: form.username });
    toast({ title: 'Sucesso', description: 'Usuário criado com sucesso' });
    setDialogOpen(false);
    setForm({ username: '', full_name: '', password: '', role: 'admin' });
    fetchUsers();
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    const { error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'update', userId: editUser.id, full_name: form.full_name, role: form.role, password: form.password || undefined },
    });
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar usuário', variant: 'destructive' });
      return;
    }
    await logAction('editar', 'usuario', editUser.id, { username: editUser.username });
    toast({ title: 'Sucesso', description: 'Usuário atualizado' });
    setDialogOpen(false);
    setEditUser(null);
    setForm({ username: '', full_name: '', password: '', role: 'admin' });
    fetchUsers();
  };

  const toggleActive = async (u: UserRow) => {
    await supabase.functions.invoke('manage-user', {
      body: { action: 'toggle_active', userId: u.id, active: !u.active },
    });
    await logAction(u.active ? 'desativar' : 'ativar', 'usuario', u.id, { username: u.username });
    fetchUsers();
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setForm({ username: u.username, full_name: u.full_name, password: '', role: u.role });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditUser(null);
    setForm({ username: '', full_name: '', password: '', role: 'admin' });
    setDialogOpen(true);
  };

  if (!isAdmin) return <p className="text-muted-foreground p-8">Acesso restrito a administradores.</p>;

  const roleLabel = (r: string) => r === 'admin' ? 'Administrador' : 'Segurança & Docs';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciar Usuários</h1>
          <p className="text-muted-foreground text-sm">Criar, editar e gerenciar acessos ao sistema</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Novo Usuário</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.full_name}</TableCell>
                  <TableCell><Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{roleLabel(u.role)}</Badge></TableCell>
                  <TableCell><Badge variant={u.active ? 'default' : 'destructive'}>{u.active ? 'Ativo' : 'Desativado'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)} disabled={!u.active} title={!u.active ? 'Reative o usuário para editar' : 'Editar'}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmToggle(u)} title={u.active ? 'Desativar usuário' : 'Reativar usuário'}>
                        {u.active ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-primary" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Login (usuário)</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editUser} placeholder="nome.sobrenome" />
            </div>
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nome Completo" />
            </div>
            <div className="space-y-2">
              <Label>{editUser ? 'Nova senha (deixe vazio para manter)' : 'Senha'}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required={!editUser} />
            </div>
            <div className="space-y-2">
              <Label>Nível de acesso</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                  <SelectItem value="seguranca_docs">Segurança & Docs (Restrito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={editUser ? handleUpdate : handleCreate}>
              {editUser ? 'Salvar Alterações' : 'Criar Usuário'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import type { FormEvent } from 'react';

import type { Column } from '../components/ui';
import { Table, Button, Modal, Input, Select, Badge, Spinner } from '../components/ui';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OPERADOR',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'OPERADOR' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update without sending empty password unless we want to change it (here, strictly no password edit in this simplified form)
        const updateData = { name: formData.name, email: formData.email, role: formData.role };
        await api.put(`/users/${editingUser.id}`, updateData);
      } else {
        // Create user requires all fields
        await api.post('/users', formData);
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      alert('Erro ao salvar usuário');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja desativar este usuário?')) {
      try {
        await api.delete(`/users/${id}`);
        loadUsers();
      } catch (err) {
        console.error('Erro ao desativar usuário:', err);
        alert('Erro ao desativar usuário');
      }
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="danger">Admin</Badge>;
      case 'GERENTE':
        return <Badge variant="warning">Gerente</Badge>;
      default:
        return <Badge variant="info">Operador</Badge>;
    }
  };

  const statusBadge = (isActive: boolean) => {
    // defaults to true if isActive is undefined, depending on backend implementation
    const active = isActive !== false;
    return active ? (
      <Badge variant="success">Ativo</Badge>
    ) : (
      <Badge variant="danger">Inativo</Badge>
    );
  };

  const columns: Column<User>[] = [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Perfil',
      render: (u) => roleBadge(u.role),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (u) => statusBadge(u.isActive),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (u) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleOpenEdit(u)}>
            Editar
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>
            Desativar
          </Button>
        </div>
      ),
    },
  ];

  const roleOptions = [
    { value: 'OPERADOR', label: 'Operador' },
    { value: 'GERENTE', label: 'Gerente' },
    { value: 'ADMIN', label: 'Admin' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Usuários</h1>
        <Button onClick={handleOpenNew}>Novo Usuário</Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <Table columns={columns} data={users} emptyMessage="Nenhum usuário encontrado" />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          {!editingUser && (
            <Input
              label="Senha"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          )}
          <Select
            label="Perfil"
            options={roleOptions}
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

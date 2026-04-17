import type React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Column } from '../components/ui';
import { Table, Button, Input, Select, Badge, Spinner } from '../components/ui';
import { api } from '../services/api';

interface Category {
  name: string;
}

interface Product {
  id: string;
  image_url: string | null;
  name: string;
  barcode: string;
  categories: Category | null;
  price: number;
  stock_qty: number;
  stock_min: number;
  unit: string;
  active: boolean;
}

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    category_id: '',
    active: 'all',
  });

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    totalPages: 0,
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Tentativa de carregar categorias para o filtro
    api
      .get('/categories')
      .then((res) => {
        // Se a API retornar formato paginado ou apenas array
        const cats = Array.isArray(res.data) ? res.data : res.data.data || [];
        setCategories(cats);
      })
      .catch(() => {
        // API pode não estar implementada ainda, ignoramos
      });
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        page: filters.page,
        limit: filters.limit,
      };

      if (filters.search) params.search = filters.search;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.active !== 'all') params.active = filters.active;

      const res = await api.get('/products', { params });
      // Trata tanto retorno paginado padrão { data, total, page... } como fallback em array
      const dataArray = res.data?.data || res.data || [];

      setProducts(dataArray);
      setMeta({
        total: res.data?.total || dataArray.length,
        page: res.data?.page || filters.page,
        totalPages: res.data?.totalPages || 1,
      });
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, category_id: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, active: e.target.value, page: 1 }));
  };

  const handlePrevPage = () => {
    if (filters.page > 1) {
      setFilters((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (filters.page < meta.totalPages) {
      setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja desativar este produto?')) {
      try {
        await api.delete(`/products/${id}`);
        loadProducts();
      } catch (err) {
        console.error('Erro ao desativar produto:', err);
        alert('Erro ao desativar produto');
      }
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'image',
      label: 'Imagem',
      render: (p) => (
        <img
          src={p.image_url || 'https://via.placeholder.com/40'}
          alt={p.name}
          width={40}
          height={40}
          className="rounded object-cover"
        />
      ),
    },
    { key: 'name', label: 'Nome' },
    { key: 'barcode', label: 'Cód. Barras' },
    {
      key: 'category',
      label: 'Categoria',
      render: (p) => p.categories?.name || '-',
    },
    {
      key: 'price',
      label: 'Preço',
      render: (p) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price),
    },
    {
      key: 'stock',
      label: 'Estoque',
      render: (p) => {
        let variant: 'success' | 'danger' | 'secondary' | 'info' | 'warning' = 'success';
        if (p.stock_qty === 0) variant = 'secondary';
        else if (p.stock_qty <= p.stock_min) variant = 'danger';
        return (
          <Badge variant={variant}>
            {p.stock_qty} {p.unit}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) =>
        p.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="danger">Inativo</Badge>,
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (p) => (
        <div className="flex gap-2 justify-end w-full">
          <Button size="sm" variant="neutral" onClick={() => navigate(`/products/${p.id}/edit`)}>
            Editar
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>
            Desativar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Produtos</h1>
        <Button onClick={() => navigate('/products/new')}>Novo Produto</Button>
      </div>

      <div className="flex gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded shadow-sm items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Buscar"
            placeholder="Nome ou Código..."
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>
        <div className="w-64">
          <Select
            label="Categoria"
            value={filters.category_id}
            onChange={handleCategoryChange}
            options={[
              { value: '', label: 'Todas' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <div className="w-48">
          <Select
            label="Status"
            value={filters.active}
            onChange={handleStatusChange}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'true', label: 'Ativos' },
              { value: 'false', label: 'Inativos' },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Table columns={columns} data={products} emptyMessage="Nenhum produto encontrado" />

          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Página {meta.page} de {meta.totalPages || 1} ({meta.total} itens)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={meta.page <= 1} onClick={handlePrevPage}>
                Anterior
              </Button>
              <Button
                variant="neutral"
                disabled={meta.page >= meta.totalPages || meta.totalPages === 0}
                onClick={handleNextPage}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

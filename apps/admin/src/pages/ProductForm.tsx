import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { Input, Select, Button, Spinner } from '../components/ui';
import ImageUpload from '../components/ui/ImageUpload';
import api from '../services/api';

const productSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  barcode: z.string().optional(),
  category_id: z.string().optional().or(z.literal('')),
  price: z.coerce.number().min(0, 'O preço longo deve ser maior ou igual a zero'),
  cost: z.coerce.number().min(0, 'O custo deve ser maior ou igual a zero'),
  unit: z.enum(['un', 'kg', 'l']),
  ncm: z.string().optional(),
  stock_qty: z.coerce.number().min(0, 'O estoque não pode ser negativo'),
  stock_min: z.coerce.number().min(0, 'O estoque mínimo não pode ser negativo'),
  active: z.boolean().default(true),
});

type ProductFormInputs = z.infer<typeof productSchema>;

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFormInputs>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      barcode: '',
      category_id: '',
      price: 0,
      cost: 0,
      unit: 'un',
      ncm: '',
      stock_qty: 0,
      stock_min: 0,
      active: true,
    },
  });

  useEffect(() => {
    // Carregar categorias
    api
      .get('/categories')
      .then((res) => {
        const cats = Array.isArray(res.data) ? res.data : res.data.data || [];
        setCategories(cats);
      })
      .catch((err) => console.error('Erro ao buscar categorias:', err));

    // Carregar produto se estiver em modo de edição
    if (isEditing) {
      api
        .get(`/products/${id}`)
        .then((res) => {
          const product = res.data;
          reset({
            name: product.name,
            barcode: product.barcode || '',
            category_id: product.category_id || '',
            price: product.price,
            cost: product.cost || 0,
            unit: product.unit || 'un',
            ncm: product.ncm || '',
            stock_qty: product.stock_qty || 0,
            stock_min: product.stock_min || 0,
            active: product.active ?? true,
          });
          setCurrentImageUrl(product.image_url || null);
        })
        .catch((err) => {
          console.error('Erro ao buscar produto:', err);
          alert('Erro ao carregar produto.');
          navigate('/products');
        })
        .finally(() => setInitialLoading(false));
    }
  }, [id, isEditing, navigate, reset]);

  const generateBarcode = () => {
    // Gera EAN-13 brasileiro: 789 + 9 dígitos aleatórios + 1 dígito verificador
    let ean = '789';
    for (let i = 0; i < 9; i++) {
      ean += Math.floor(Math.random() * 10).toString();
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(ean[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const finalBarcode = ean + checkDigit;

    setValue('barcode', finalBarcode, { shouldValidate: true });
  };

  const onSubmit = async (data: ProductFormInputs) => {
    setLoading(true);

    const payload: any = {
      ...data,
      category_id: data.category_id || undefined,
    };

    if (imageRemoved) {
      payload.image_url = null;
    }

    try {
      if (isEditing) {
        if (imageFile) {
          const formData = new FormData();
          formData.append('file', imageFile);
          await api.post(`/products/${id}/image`, formData);
        }
        await api.put(`/products/${id}`, payload);
      } else {
        const res = await api.post('/products', payload);
        const newId = res.data.id;

        if (imageFile && newId) {
          const formData = new FormData();
          formData.append('file', imageFile);
          await api.post(`/products/${newId}/image`, formData);
        }
      }
      navigate('/products');
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      alert(error.response?.data?.message || 'Erro ao salvar o produto');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">
          {isEditing ? 'Editar Produto' : 'Novo Produto'}
        </h1>
        <Button variant="secondary" onClick={() => navigate('/products')}>
          Cancelar
        </Button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-gray-800 p-6 rounded shadow-sm space-y-6"
      >
        <div className="mb-6">
          <ImageUpload
            currentImageUrl={currentImageUrl}
            onUpload={(file) => {
              setImageFile(file);
              setImageRemoved(false);
            }}
            onRemove={() => {
              setImageFile(null);
              setImageRemoved(true);
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <div className="md:col-span-2">
            <Input
              label="Nome do Produto *"
              placeholder="Ex: Arroz Tipo 1"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          {/* Código de Barras */}
          <div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="Código de Barras (EAN-13)"
                  placeholder="Ex: 7891000000000"
                  error={errors.barcode?.message}
                  {...register('barcode')}
                />
              </div>
              <Button type="button" variant="secondary" onClick={generateBarcode}>
                Gerar
              </Button>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <Select
              label="Categoria"
              error={errors.category_id?.message}
              {...register('category_id')}
              options={[
                { value: '', label: 'Nenhuma ou Selecione...' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          {/* Preço */}
          <div>
            <Input
              label="Preço de Venda (R$) *"
              type="number"
              step="0.01"
              min="0"
              error={errors.price?.message}
              {...register('price')}
            />
          </div>

          {/* Custo */}
          <div>
            <Input
              label="Custo (R$)"
              type="number"
              step="0.01"
              min="0"
              error={errors.cost?.message}
              {...register('cost')}
            />
          </div>

          {/* Unidade */}
          <div>
            <Select
              label="Unidade M."
              error={errors.unit?.message}
              {...register('unit')}
              options={[
                { value: 'un', label: 'Unidade (UN)' },
                { value: 'kg', label: 'Quilo (KG)' },
                { value: 'l', label: 'Litro (L)' },
              ]}
            />
          </div>

          {/* NCM */}
          <div>
            <Input
              label="NCM"
              placeholder="Ex: 10063021"
              error={errors.ncm?.message}
              {...register('ncm')}
            />
          </div>

          {/* Estoque atual */}
          <div>
            <Input
              label="Estoque Atual"
              type="number"
              min="0"
              error={errors.stock_qty?.message}
              {...register('stock_qty')}
            />
          </div>

          {/* Estoque mínimo */}
          <div>
            <Input
              label="Estoque Mínimo"
              type="number"
              min="0"
              error={errors.stock_min?.message}
              {...register('stock_min')}
            />
          </div>

          {/* Ativo */}
          <div className="md:col-span-2 flex items-center mt-2">
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                {...register('active')}
              />
              <span className="font-medium">Produto Ativo</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button type="submit" loading={loading}>
            {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </div>
      </form>
    </div>
  );
}

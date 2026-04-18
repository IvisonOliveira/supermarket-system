-- =============================================================================
-- Supermarket System — Schema Principal
-- Banco: PostgreSQL via Supabase
-- Convenção: snake_case, UUID como PK (gen_random_uuid()), timestamps em UTC
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- índices GIN para busca textual

-- ---------------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------------
CREATE TYPE user_role          AS ENUM ('ADMIN', 'GERENTE', 'OPERADOR');
CREATE TYPE product_unit       AS ENUM ('UN', 'KG', 'LT', 'CX');
CREATE TYPE sale_status        AS ENUM ('pending', 'synced', 'cancelled');
CREATE TYPE payment_method     AS ENUM ('dinheiro', 'credito', 'debito', 'pix', 'voucher');
CREATE TYPE stock_movement_type AS ENUM ('entrada', 'saida', 'ajuste', 'venda');

-- =============================================================================
-- TABELA: users
-- Integrada ao Supabase Auth: id referencia auth.users(id).
-- Armazena apenas dados de perfil operacional + controle de acesso.
-- =============================================================================
CREATE TABLE users (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  role         user_role   NOT NULL DEFAULT 'OPERADOR',
  active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users           IS 'Perfis operacionais vinculados ao Supabase Auth';
COMMENT ON COLUMN users.id        IS 'Referencia auth.users(id) — gerenciado pelo Supabase Auth';
COMMENT ON COLUMN users.role      IS 'Perfil de acesso: ADMIN > GERENTE > OPERADOR';

-- ---------------------------------------------------------------------------
-- Trigger: atualiza updated_at automaticamente em qualquer UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABELA: categories
-- Categorias de produtos (hierarquia plana por simplicidade inicial).
-- =============================================================================
CREATE TABLE categories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID        REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  description TEXT,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_name_unique UNIQUE (name)
);

COMMENT ON TABLE categories IS 'Categorias de produtos';

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABELA: products
-- Catálogo de produtos. Campos fiscais (ncm, cfop, cest) devem ser revisados
-- manualmente — nunca confiar em valores gerados automaticamente.
-- =============================================================================
CREATE TABLE products (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID          REFERENCES categories(id) ON DELETE SET NULL,
  barcode      TEXT          NOT NULL,
  sku          TEXT,
  name         TEXT          NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  cost         NUMERIC(10,2) NOT NULL CHECK (cost >= 0),
  stock_qty    NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  stock_min    NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (stock_min >= 0),
  unit         product_unit  NOT NULL DEFAULT 'UN',
  image_url    TEXT,

  -- Campos fiscais — REVISAR manualmente conforme NCM do produto
  ncm          CHAR(8)       NOT NULL,
  cfop         CHAR(4)       NOT NULL,
  cest         VARCHAR(9),

  active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT products_barcode_unique UNIQUE (barcode)
);

COMMENT ON TABLE  products            IS 'Catálogo de produtos';
COMMENT ON COLUMN products.ncm        IS 'Código NCM (8 dígitos) — revisar manualmente';
COMMENT ON COLUMN products.cfop       IS 'CFOP (4 dígitos) — revisar manualmente';
COMMENT ON COLUMN products.cest       IS 'Código CEST — preencher quando aplicável';
COMMENT ON COLUMN products.stock_qty  IS 'Saldo atual; atualizado por trigger em stock_movements';
COMMENT ON COLUMN products.stock_min  IS 'Gatilho de alerta diário às 8h quando stock_qty <= stock_min';

CREATE INDEX idx_products_barcode    ON products (barcode);
CREATE INDEX idx_products_category   ON products (category_id);
CREATE INDEX idx_products_name_trgm  ON products USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABELA: cashiers
-- Representa um caixa físico. Relacionado a sessões de abertura/fechamento.
-- =============================================================================
CREATE TABLE cashiers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL,
  description TEXT,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cashiers_code_unique UNIQUE (code)
);

COMMENT ON TABLE cashiers IS 'Caixas físicos do PDV';

CREATE TRIGGER trg_cashiers_updated_at
  BEFORE UPDATE ON cashiers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABELA: sales
-- Uma venda por registro. O id é gerado no cliente (PDV) para garantir
-- idempotência no sync offline-first — duplicatas são ignoradas pelo backend.
-- =============================================================================
CREATE TABLE sales (
  id             UUID           PRIMARY KEY,   -- UUID gerado no cliente (PDV)
  cashier_id     UUID           NOT NULL REFERENCES cashiers(id),
  operator_id    UUID           NOT NULL REFERENCES users(id),
  subtotal       NUMERIC(10,2)  NOT NULL CHECK (subtotal >= 0),
  discount       NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total          NUMERIC(10,2)  NOT NULL CHECK (total >= 0),
  payment_method payment_method NOT NULL,
  payment_amount NUMERIC(10,2)  NOT NULL CHECK (payment_amount >= 0),
  change         NUMERIC(10,2)  NOT NULL DEFAULT 0 CHECK (change >= 0),
  status         sale_status    NOT NULL DEFAULT 'pending',
  nfce_key       TEXT,          -- Chave NF-e após emissão pelo Focus NFe
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  synced_at      TIMESTAMPTZ,

  CONSTRAINT sales_total_check CHECK (total = subtotal - discount),
  CONSTRAINT sales_change_check CHECK (change = payment_amount - total)
);

COMMENT ON TABLE  sales            IS 'Vendas registradas no PDV';
COMMENT ON COLUMN sales.id         IS 'UUID gerado no cliente — garante idempotência no sync';
COMMENT ON COLUMN sales.nfce_key   IS 'Chave de 44 dígitos da NFC-e emitida pelo Focus NFe';
COMMENT ON COLUMN sales.synced_at  IS 'Preenchido quando a venda offline chega ao servidor';

CREATE INDEX idx_sales_cashier    ON sales (cashier_id);
CREATE INDEX idx_sales_operator   ON sales (operator_id);
CREATE INDEX idx_sales_status     ON sales (status);
CREATE INDEX idx_sales_created_at ON sales (created_at DESC);

-- =============================================================================
-- TABELA: sale_items
-- Itens de cada venda. Armazena snapshot de preço/nome no momento da venda
-- para garantir histórico imutável mesmo que o produto mude.
-- =============================================================================
CREATE TABLE sale_items (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  UUID          NOT NULL REFERENCES products(id),
  barcode      TEXT          NOT NULL,  -- snapshot
  name         TEXT          NOT NULL,  -- snapshot
  ncm_snapshot CHAR(8)       NOT NULL DEFAULT '00000000', -- snapshot do NCM para NFC-e
  qty          NUMERIC(10,3) NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  discount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total       NUMERIC(10,2) NOT NULL CHECK (total >= 0),

  CONSTRAINT sale_items_total_check
    CHECK (total = ROUND((qty * unit_price) - discount, 2))
);

COMMENT ON TABLE  sale_items           IS 'Itens de cada venda';
COMMENT ON COLUMN sale_items.barcode   IS 'Snapshot do código de barras no momento da venda';
COMMENT ON COLUMN sale_items.name      IS 'Snapshot do nome do produto no momento da venda';
COMMENT ON COLUMN sale_items.unit_price IS 'Snapshot do preço unitário no momento da venda';

CREATE INDEX idx_sale_items_sale    ON sale_items (sale_id);
CREATE INDEX idx_sale_items_product ON sale_items (product_id);

-- =============================================================================
-- TABELA: stock_movements
-- Toda alteração de estoque passa por aqui.
-- O saldo em products.stock_qty é mantido por trigger nesta tabela.
-- =============================================================================
CREATE TABLE stock_movements (
  id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID                NOT NULL REFERENCES products(id),
  type        stock_movement_type NOT NULL,
  qty         NUMERIC(10,3)       NOT NULL CHECK (qty > 0),
  qty_before  NUMERIC(10,3)       NOT NULL CHECK (qty_before >= 0),
  qty_after   NUMERIC(10,3)       NOT NULL CHECK (qty_after >= 0),
  reason      TEXT,
  sale_id     UUID                REFERENCES sales(id) ON DELETE SET NULL,
  operator_id UUID                NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  stock_movements         IS 'Ledger imutável de movimentações de estoque';
COMMENT ON COLUMN stock_movements.qty     IS 'Sempre positivo; o tipo (entrada/saida/venda) define a direção';
COMMENT ON COLUMN stock_movements.sale_id IS 'Preenchido apenas quando type = venda';

CREATE INDEX idx_stock_movements_product    ON stock_movements (product_id);
CREATE INDEX idx_stock_movements_sale       ON stock_movements (sale_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements (created_at DESC);

-- ---------------------------------------------------------------------------
-- Trigger: sincroniza products.stock_qty após cada INSERT em stock_movements
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE products
  SET stock_qty = NEW.qty_after
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_product_stock
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION sync_product_stock();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Ativado em todas as tabelas. Políticas de acesso controladas por role JWT.
-- =============================================================================
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashiers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  ENABLE ROW LEVEL SECURITY;

-- O backend usa a service_role key (bypassa RLS) para todas as operações.
-- Políticas abaixo destinam-se a acesso direto pelo cliente (admin / PDV web).

-- Leitura pública autenticada para catálogo de produtos e categorias
CREATE POLICY "Autenticados podem ler produtos"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Autenticados podem ler categorias"
  ON categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- TABELA: cashier_sessions
-- Sessões de abertura e fechamento de caixa
-- =============================================================================
CREATE TABLE cashier_sessions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id        UUID        NOT NULL REFERENCES users(id),
  cashier_id         UUID        NOT NULL REFERENCES cashiers(id),
  opened_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at          TIMESTAMPTZ,
  opening_amount     NUMERIC(10,2) NOT NULL CHECK (opening_amount >= 0),
  closing_amount     NUMERIC(10,2) CHECK (closing_amount >= 0),
  total_sales        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
  total_transactions INTEGER     NOT NULL DEFAULT 0 CHECK (total_transactions >= 0),
  status             TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

CREATE UNIQUE INDEX idx_cashier_sessions_single_open 
  ON cashier_sessions(operator_id) 
  WHERE status = 'open';

COMMENT ON TABLE cashier_sessions IS 'Sessões de abertura e fechamento de caixa por operador';

ALTER TABLE cashier_sessions ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas seu próprio perfil (escrita via backend/service_role)
CREATE POLICY "Usuário lê seu próprio perfil"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- =============================================================================
-- TABELA: fiscal_documents
-- =============================================================================
CREATE TABLE fiscal_documents (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id        UUID        NOT NULL REFERENCES sales(id) ON DELETE CASCADE UNIQUE,
  type           TEXT        NOT NULL DEFAULT 'nfce' CHECK (type IN ('nfce', 'nfe')),
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'cancelled', 'rejected')),
  access_key     CHAR(44),
  xml_url        TEXT,
  protocol       TEXT,
  error_message  TEXT,
  issued_at      TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fiscal_documents IS 'Documentos Fiscais via Focus NFe';

ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_fiscal_documents_updated_at
  BEFORE UPDATE ON fiscal_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Autenticados podem ler documentos fiscais"
  ON fiscal_documents FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- TABELA: certificate_config
-- =============================================================================
CREATE TABLE certificate_config (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj           TEXT        NOT NULL,
  razao_social   TEXT        NOT NULL,
  valid_until    TIMESTAMPTZ NOT NULL,
  storage_path   TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE certificate_config IS 'Registro central do Certificado Digital A1 ativo';

ALTER TABLE certificate_config ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_certificate_config_updated_at
  BEFORE UPDATE ON certificate_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABELA: stock_alerts
-- Avisos automáticos do CRON para perigo de produtos zerando.
-- =============================================================================
CREATE TABLE stock_alerts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  current_qty    NUMERIC(10,3) NOT NULL,
  min_qty        NUMERIC(10,3) NOT NULL,
  acknowledged   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stock_alerts IS 'Alertas pendentes gerados automaticamente às 8h';

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_stock_alerts_updated_at
  BEFORE UPDATE ON stock_alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "Autenticados gerenciam alertas pendentes"
  ON stock_alerts FOR ALL
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- FIM DO SCHEMA
-- Para aplicar: supabase db push  (local)  ou  cole no SQL Editor do Supabase
-- =============================================================================


-- ============================================
-- Gestão de Demandas - Supabase Schema
-- Execute this in your Supabase SQL Editor
-- ============================================

-- Enum for priority
CREATE TYPE prioridade_enum AS ENUM ('Medium', 'High', 'Highst');

-- Enum for status
CREATE TYPE status_enum AS ENUM (
  'Pendente',
  'Aguardando aprovação',
  'Aprovado',
  'Desenvolvendo',
  'Aprovado e entregue'
);

-- Demandas table
CREATE TABLE demandas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_glpi VARCHAR(50) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  prioridade prioridade_enum NOT NULL DEFAULT 'Medium',
  prazo DATE,
  status status_enum NOT NULL DEFAULT 'Pendente',
  anotacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Checklist table
CREATE TABLE checklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  concluido BOOLEAN DEFAULT false,
  data DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notas table
CREATE TABLE notas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conteudo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_demandas_status ON demandas(status);
CREATE INDEX idx_demandas_prioridade ON demandas(prioridade);
CREATE INDEX idx_demandas_glpi ON demandas(numero_glpi);
CREATE INDEX idx_demandas_created ON demandas(created_at);
CREATE INDEX idx_checklist_data ON checklist(data);
CREATE INDEX idx_notas_updated ON notas(updated_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_demandas_updated
  BEFORE UPDATE ON demandas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_notas_updated
  BEFORE UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS (personal system, single-user)
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

-- Allow all operations (anon key)
CREATE POLICY "Allow all on demandas" ON demandas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on checklist" ON checklist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on notas" ON notas FOR ALL USING (true) WITH CHECK (true);

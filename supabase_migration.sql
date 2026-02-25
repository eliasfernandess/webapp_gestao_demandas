-- ============================================
-- Migration: Add new statuses, situacao, and demanda_pai_id
-- Execute this in your Supabase SQL Editor
-- ============================================

-- 1. Add new values to status_enum
ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'Aprovação';
ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'Em correção';

-- 2. Create situacao_enum
DO $$ BEGIN
  CREATE TYPE situacao_enum AS ENUM (
    'Em andamento',
    'Entregue',
    'Atrasado',
    'Aguardando aprovação'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add new columns to demandas
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS situacao situacao_enum NOT NULL DEFAULT 'Em andamento';
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS demanda_pai_id UUID REFERENCES demandas(id) ON DELETE SET NULL;

-- 4. Index for new columns
CREATE INDEX IF NOT EXISTS idx_demandas_situacao ON demandas(situacao);
CREATE INDEX IF NOT EXISTS idx_demandas_pai ON demandas(demanda_pai_id);

-- 5. Auto-update situacao based on prazo (optional trigger)
-- You can also handle this in the frontend
CREATE OR REPLACE FUNCTION update_situacao()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is 'Aprovado e entregue', situacao = 'Entregue'
  IF NEW.status = 'Aprovado e entregue' THEN
    NEW.situacao = 'Entregue';
  -- If status is 'Aguardando aprovação' or 'Aprovação', situacao = 'Aguardando aprovação'
  ELSIF NEW.status IN ('Aguardando aprovação', 'Aprovação') THEN
    NEW.situacao = 'Aguardando aprovação';
  -- If prazo is set and past due and not entregue
  ELSIF NEW.prazo IS NOT NULL AND NEW.prazo < CURRENT_DATE AND NEW.status != 'Aprovado e entregue' THEN
    NEW.situacao = 'Atrasado';
  ELSE
    NEW.situacao = 'Em andamento';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_demandas_situacao ON demandas;
CREATE TRIGGER trigger_demandas_situacao
  BEFORE INSERT OR UPDATE ON demandas
  FOR EACH ROW EXECUTE FUNCTION update_situacao();

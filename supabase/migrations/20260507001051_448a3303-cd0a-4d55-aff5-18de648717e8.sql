-- Phase U.3: Upgrade categories to OS Launcher Nodes
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS node_type varchar(50) DEFAULT 'DEPARTMENT',
  ADD COLUMN IF NOT EXISTS mini_program_id uuid REFERENCES public.mini_programs(id);

-- Add CHECK constraint for node_type (drop-then-add for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_node_type_check'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_node_type_check
      CHECK (node_type IN ('DEPARTMENT', 'MINI_PROGRAM', 'EXTERNAL_LINK'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_node_type ON public.categories(node_type);
CREATE INDEX IF NOT EXISTS idx_categories_mini_program_id ON public.categories(mini_program_id);
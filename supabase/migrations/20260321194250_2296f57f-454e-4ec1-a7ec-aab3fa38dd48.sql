
-- Add project_id to bid_items so items are per-project
ALTER TABLE public.bid_items ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Delete all existing seeded bid_items (they were global, not per-project)
DELETE FROM public.price_quotes;
DELETE FROM public.bid_items;

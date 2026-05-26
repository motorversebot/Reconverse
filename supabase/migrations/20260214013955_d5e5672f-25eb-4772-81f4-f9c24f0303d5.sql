
-- Enums
CREATE TYPE public.estimate_status AS ENUM ('draft', 'submitted', 'approved', 'partial_approved', 'declined', 'void');
CREATE TYPE public.operation_category AS ENUM ('mechanical', 'body', 'detail', 'diag', 'other');
CREATE TYPE public.operation_priority AS ENUM ('safety', 'recommended', 'cosmetic');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'declined');
CREATE TYPE public.estimate_item_type AS ENUM ('labor', 'part', 'misc');
CREATE TYPE public.discount_type AS ENUM ('none', 'percent', 'amount');
CREATE TYPE public.work_order_status AS ENUM ('open', 'in_progress', 'done');
CREATE TYPE public.work_order_item_status AS ENUM ('open', 'done');

-- A) estimates
CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id),
  version_number int NOT NULL DEFAULT 1,
  status estimate_status NOT NULL DEFAULT 'draft',
  labor_rate_default numeric NOT NULL DEFAULT 125.00,
  tax_rate_default numeric NOT NULL DEFAULT 0.08,
  shop_supplies_percent numeric NOT NULL DEFAULT 0.05,
  discount_type discount_type NOT NULL DEFAULT 'none',
  discount_value numeric NOT NULL DEFAULT 0,
  notes_internal text,
  notes_customer text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read estimates" ON public.estimates FOR SELECT USING (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: insert estimates" ON public.estimates FOR INSERT WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: update estimates" ON public.estimates FOR UPDATE USING (is_dealer_member(dealer_id)) WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer admins: delete estimates" ON public.estimates FOR DELETE USING (is_dealer_admin(dealer_id));
CREATE POLICY "Platform admin: full access estimates" ON public.estimates FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- B) estimate_operations
CREATE TABLE public.estimate_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id),
  name text NOT NULL,
  category operation_category NOT NULL DEFAULT 'mechanical',
  priority operation_priority NOT NULL DEFAULT 'recommended',
  sort_order int NOT NULL DEFAULT 0,
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read estimate_operations" ON public.estimate_operations FOR SELECT USING (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: insert estimate_operations" ON public.estimate_operations FOR INSERT WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: update estimate_operations" ON public.estimate_operations FOR UPDATE USING (is_dealer_member(dealer_id)) WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: delete estimate_operations" ON public.estimate_operations FOR DELETE USING (is_dealer_member(dealer_id));
CREATE POLICY "Platform admin: full access estimate_operations" ON public.estimate_operations FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE TRIGGER update_estimate_operations_updated_at BEFORE UPDATE ON public.estimate_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- C) estimate_items
CREATE TABLE public.estimate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES public.estimate_operations(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id),
  type estimate_item_type NOT NULL DEFAULT 'labor',
  description text NOT NULL DEFAULT '',
  qty numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  labor_rate numeric NOT NULL DEFAULT 0,
  part_number text,
  vendor text,
  taxable boolean NOT NULL DEFAULT true,
  status approval_status NOT NULL DEFAULT 'pending',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read estimate_items" ON public.estimate_items FOR SELECT USING (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: insert estimate_items" ON public.estimate_items FOR INSERT WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: update estimate_items" ON public.estimate_items FOR UPDATE USING (is_dealer_member(dealer_id)) WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: delete estimate_items" ON public.estimate_items FOR DELETE USING (is_dealer_member(dealer_id));
CREATE POLICY "Platform admin: full access estimate_items" ON public.estimate_items FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE TRIGGER update_estimate_items_updated_at BEFORE UPDATE ON public.estimate_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- D) work_orders
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id),
  source_estimate_id uuid REFERENCES public.estimates(id),
  status work_order_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read work_orders" ON public.work_orders FOR SELECT USING (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: insert work_orders" ON public.work_orders FOR INSERT WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: update work_orders" ON public.work_orders FOR UPDATE USING (is_dealer_member(dealer_id)) WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Platform admin: full access work_orders" ON public.work_orders FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- E) work_order_items
CREATE TABLE public.work_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id),
  source_estimate_item_id uuid REFERENCES public.estimate_items(id),
  type estimate_item_type NOT NULL DEFAULT 'labor',
  description text NOT NULL DEFAULT '',
  qty numeric NOT NULL DEFAULT 1,
  hours numeric NOT NULL DEFAULT 0,
  labor_rate numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  status work_order_item_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read work_order_items" ON public.work_order_items FOR SELECT USING (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: insert work_order_items" ON public.work_order_items FOR INSERT WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Dealer members: update work_order_items" ON public.work_order_items FOR UPDATE USING (is_dealer_member(dealer_id)) WITH CHECK (is_dealer_member(dealer_id));
CREATE POLICY "Platform admin: full access work_order_items" ON public.work_order_items FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE TRIGGER update_work_order_items_updated_at BEFORE UPDATE ON public.work_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

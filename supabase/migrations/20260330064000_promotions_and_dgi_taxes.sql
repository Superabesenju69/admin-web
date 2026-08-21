-- Migration: Promotions Module & DGI Nicaraguan Tax Compliance
-- Description: Adds robust promotion mechanics, BOGO rules, and explicit tax/discount derivations per the Ley de Concertación Tributaria (LCT) of Nicaragua.

-- 1. Create the Promotions Table
CREATE TABLE public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'bogo')),
    discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_automatic BOOLEAN NOT NULL DEFAULT false,
    allow_stacking BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    schedule_rules JSONB, -- { "days": [1,2,3], "timeStart": "14:00", "timeEnd": "18:00" }
    conditions JSONB, -- { "minOrderAmount": 500 }
    bogo_rules JSONB, -- { "buyQuantity": 2, "getQuantity": 1, "discountType": "percentage", "discountValue": 100 }
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the Promotion Targets Table (What items/categories the promo applies to)
CREATE TABLE public.promotion_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('item', 'category', 'all')),
    target_id UUID, -- References menu_items.id OR menu_categories.id (Null if 'all')
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Modify orders table to strictly follow Nicaragua's Tax Math
ALTER TABLE public.orders
ADD COLUMN subtotal_bruto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN total_descuentos DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN base_imponible_iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN monto_iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN total_neto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN applied_promotions JSONB; -- Store array of UUIDs mapped to discount values used

-- Note for `orders`: Ensure existing `total_amount` data gracefully merges or is understood.
-- `total_amount` will now be synonymous with `total_neto`.

-- 4. Modify order_line_items to strictly track itemized discounts
ALTER TABLE public.order_line_items
ADD COLUMN subtotal_bruto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN base_imponible_iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL;

-- 5. Note: Discount priority logic is handled in the POS app engine (posStore.ts recalculateCartMath).
-- The system supports "max_discount" (benefit customer) by default, configurable at runtime.

-- 6. Setup RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to promotions" ON public.promotions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to promotion_targets" ON public.promotion_targets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

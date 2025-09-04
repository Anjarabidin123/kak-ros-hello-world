-- Fix security warning by setting search_path properly
DROP FUNCTION IF EXISTS public.generate_invoice_number(BOOLEAN);

CREATE OR REPLACE FUNCTION public.generate_invoice_number(is_manual BOOLEAN DEFAULT FALSE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  day_str TEXT := LPAD(EXTRACT(day FROM current_date)::text, 2, '0');
  month_str TEXT := LPAD(EXTRACT(month FROM current_date)::text, 2, '0');
  year_str TEXT := EXTRACT(year FROM current_date)::text;
  date_suffix TEXT := day_str || month_str || year_str;
  counter INTEGER;
  prefix TEXT;
BEGIN
  -- Set prefix based on type
  IF is_manual THEN
    prefix := 'MNL';
  ELSE  
    prefix := 'INV';
  END IF;
  
  -- Get count of receipts for today to generate counter
  SELECT COUNT(*) + 1 INTO counter
  FROM receipts 
  WHERE DATE(created_at) = current_date
  AND receipt_number LIKE prefix || '%';
  
  RETURN prefix || '-' || counter || date_suffix;
END;
$$;
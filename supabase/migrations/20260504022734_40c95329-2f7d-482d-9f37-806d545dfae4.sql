-- Product requests table for missing-product reports from search
CREATE TABLE public.product_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  product_name TEXT NOT NULL,
  description TEXT NULL,
  barcode TEXT NULL,
  image_url TEXT NULL,
  whatsapp TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. guests) can submit a request
CREATE POLICY "Anyone can submit product requests"
ON public.product_requests
FOR INSERT
WITH CHECK (true);

-- Users can view their own requests
CREATE POLICY "Users can view their own product requests"
ON public.product_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all (uses existing has_role helper if present)
CREATE POLICY "Admins can view all product requests"
ON public.product_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product requests"
ON public.product_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_requests_updated_at
BEFORE UPDATE ON public.product_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_requests_user_id ON public.product_requests(user_id);
CREATE INDEX idx_product_requests_status ON public.product_requests(status);
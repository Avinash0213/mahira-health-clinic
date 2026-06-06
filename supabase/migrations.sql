-- Create sequence for patient codes
CREATE SEQUENCE IF NOT EXISTS public.patient_code_seq START WITH 1;

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code TEXT NOT NULL UNIQUE DEFAULT ('PAT' || lpad(nextval('public.patient_code_seq')::text, 5, '0')),
    name TEXT NOT NULL,
    date_of_birth DATE,
    age_years INTEGER,
    gender TEXT,
    phone TEXT,
    primary_contact_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- Create visits table
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'in_consultation', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vitals table
CREATE TABLE IF NOT EXISTS public.vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    notes TEXT,
    doctor_name TEXT,
    follow_up TEXT,
    rx_number TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create prescription_items table
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT NOT NULL,
    frequency TEXT,
    medicine_form TEXT,
    medicine_strength TEXT,
    override_dose NUMERIC,
    dose_per_kg NUMERIC,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create medicines table for catalog management (replacing Google Sheets catalog)
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    form TEXT NOT NULL,
    strength TEXT NOT NULL,
    dose_per_kg NUMERIC,
    unit TEXT NOT NULL,
    max_dose NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (name, form, strength)
);

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for pilot trial ease-of-use with anon key)
CREATE POLICY "Allow all access to patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to visits" ON public.visits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to vitals" ON public.vitals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prescriptions" ON public.prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prescription_items" ON public.prescription_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to medicines" ON public.medicines FOR ALL USING (true) WITH CHECK (true);

-- Create performance indices
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_primary_contact_phone ON public.patients(primary_contact_phone);
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients(patient_code);
CREATE INDEX IF NOT EXISTS idx_visits_status ON public.visits(status);
CREATE INDEX IF NOT EXISTS idx_vitals_visit_id ON public.vitals(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit_id ON public.prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);

-- Create prescription_investigations table
CREATE TABLE IF NOT EXISTS public.prescription_investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prescription_investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to prescription_investigations"
    ON public.prescription_investigations FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_investigation_prescription_id
    ON public.prescription_investigations(prescription_id);

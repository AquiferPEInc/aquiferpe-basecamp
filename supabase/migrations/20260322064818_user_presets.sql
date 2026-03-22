CREATE TABLE IF NOT EXISTS company_filter_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    acec_chapter VARCHAR(255) DEFAULT '',
    city VARCHAR(255) DEFAULT '',
    website VARCHAR(255) DEFAULT '',
    has_clients VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

ALTER TABLE company_filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own presets." ON company_filter_presets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own presets." ON company_filter_presets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets." ON company_filter_presets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets." ON company_filter_presets
    FOR DELETE USING (auth.uid() = user_id);

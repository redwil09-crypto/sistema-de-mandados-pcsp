-- Add issuing_court column to warrants table
ALTER TABLE warrants 
ADD COLUMN IF NOT EXISTS issuing_court TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'warrants' AND column_name = 'issuing_court';

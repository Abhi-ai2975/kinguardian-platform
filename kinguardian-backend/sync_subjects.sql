-- Insert Aniruddha into 8f819044-c922-4b68-9649-ab03da1090cc
INSERT INTO care_subjects (id, family_id, profile_id, external_patient_ref, preferred_timezone, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  '8f819044-c922-4b68-9649-ab03da1090cc',
  '09826f1e-24b8-4512-bb93-daa751ec9ae1',
  '{"name": "Aniruddha", "age": 68, "city": "Chennai", "country": "IN", "relationship": "Father", "role": "parent", "fam": "8f819044", "uid": "09826f1e"}',
  'Asia/Kolkata',
  'active',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM care_subjects 
  WHERE family_id = '8f819044-c922-4b68-9649-ab03da1090cc' 
  AND profile_id = '09826f1e-24b8-4512-bb93-daa751ec9ae1'
);

-- Insert into d3f57a85-1aae-43e5-9e32-a15f77b9bbbb
INSERT INTO care_subjects (id, family_id, profile_id, external_patient_ref, preferred_timezone, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'd3f57a85-1aae-43e5-9e32-a15f77b9bbbb',
  '09826f1e-24b8-4512-bb93-daa751ec9ae1',
  '{"name": "Aniruddha", "age": 68, "city": "Chennai", "country": "IN", "relationship": "Father", "role": "parent", "fam": "d3f57a85", "uid": "09826f1e"}',
  'Asia/Kolkata',
  'active',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM care_subjects 
  WHERE family_id = 'd3f57a85-1aae-43e5-9e32-a15f77b9bbbb' 
  AND profile_id = '09826f1e-24b8-4512-bb93-daa751ec9ae1'
);

INSERT INTO care_subjects (id, family_id, profile_id, external_patient_ref, preferred_timezone, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'd3f57a85-1aae-43e5-9e32-a15f77b9bbbb',
  '6107be90-9a18-4543-b1b2-1e0fe7a09319',
  '{"name": "Vandana", "age": 62, "city": "Chennai", "country": "IN", "relationship": "Mother", "role": "parent", "fam": "d3f57a85", "uid": "6107be90"}',
  'Asia/Kolkata',
  'active',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM care_subjects 
  WHERE family_id = 'd3f57a85-1aae-43e5-9e32-a15f77b9bbbb' 
  AND (profile_id = '6107be90-9a18-4543-b1b2-1e0fe7a09319' OR profile_id = '1b2608ad-92c1-4a1d-986e-5ee22c0b05ad')
);

SELECT cs.family_id, f.name, cs.profile_id, cs.external_patient_ref, cs.preferred_timezone
FROM care_subjects cs
JOIN families f ON cs.family_id = f.id
WHERE cs.family_id IN ('8f819044-c922-4b68-9649-ab03da1090cc', 'c3450830-33c0-43cf-a207-690739b9ee70', 'd3f57a85-1aae-43e5-9e32-a15f77b9bbbb')
ORDER BY cs.family_id;

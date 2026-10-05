-- 1. Update Aniruddha profile display_name
UPDATE profiles 
SET display_name = 'Aniruddha' 
WHERE (email = 'aniruddha123@gmail.com' OR display_name ILIKE '%aniruddha%')
AND email != 'aniruddha1234@gmail.com';

-- 2. Update Vandana profile display_name (remove Sharma)
UPDATE profiles 
SET display_name = 'Vandana' 
WHERE display_name ILIKE '%vandana%';

-- 3. Update CareSubjects for Aniruddha in Ram's family and any other family
UPDATE care_subjects
SET external_patient_ref = '{"name": "Aniruddha", "relationship": "Father", "role": "parent", "age": 68, "city": "Chennai", "country": "IN", "uid": "09826f1e", "fhir_id": "Patient/aniruddha-1", "fhir_identifier": "MRN-ANIRUDDHA-2026"}'
WHERE id = 'a8a8f689-6ae7-441f-bba3-262dfbfe022c'
OR (profile_id = '09826f1e-24b8-4512-bb93-daa751ec9ae1');

-- 4. Update CareSubjects for Vandana
UPDATE care_subjects
SET external_patient_ref = '{"name": "Vandana", "relationship": "Mother", "role": "parent", "age": 62, "city": "Chennai", "country": "IN", "uid": "6107be90", "fam": "f8420352"}'
WHERE id = '3c01634a-b867-4e3b-a5a6-17762505cfbc'
OR (profile_id = '6107be90-9a18-4543-b1b2-1e0fe7a09319');

-- 5. Delete duplicate / test aniruddha1234 profile, memberships, care_subject, and family
DELETE FROM care_subjects WHERE profile_id = '43e29ad6-f76e-4102-ada9-d0373e5b6022' OR id = '1349576d-a050-445b-8cb9-7fc8b10ccc3c';
DELETE FROM memberships WHERE profile_id = '43e29ad6-f76e-4102-ada9-d0373e5b6022';
DELETE FROM profiles WHERE id = '43e29ad6-f76e-4102-ada9-d0373e5b6022';
DELETE FROM families WHERE id = '8a4d6934-88ce-44e7-8350-82f3e68590a7';

-- 6. Also check if any other care_subject has 'Sharma' in external_patient_ref for Ramesh
UPDATE care_subjects
SET external_patient_ref = REPLACE(REPLACE(external_patient_ref, 'Ramesh Sharma', 'Ramesh'), ' (Parent)', '')
WHERE external_patient_ref ILIKE '%Ramesh Sharma%';

-- 7. Query to verify subjects in Ram's family
SELECT cs.id, cs.family_id, cs.profile_id, p.display_name, cs.external_patient_ref 
FROM care_subjects cs
LEFT JOIN profiles p ON cs.profile_id = p.id
WHERE cs.family_id = 'c3450830-33c0-43cf-a207-690739b9ee70';

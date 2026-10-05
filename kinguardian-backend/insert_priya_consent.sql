INSERT INTO consents (id, subject_id, granted_to_profile_id, scopes, status, created_at, updated_at) 
VALUES (gen_random_uuid(), 'a8a8f689-6ae7-441f-bba3-262dfbfe022c', 'cb9ad337-3166-4a6b-b9ca-323195ea93ca', '["vital_signs", "appointments"]', 'active', now(), now());

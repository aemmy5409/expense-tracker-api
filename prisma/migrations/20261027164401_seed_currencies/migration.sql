-- Seed supported currencies (hand-written data migration)
INSERT INTO "Currency" ("code", "name", "symbol", "minor_units") VALUES
    ('NGN', 'Nigerian Naira', '₦', 2),
    ('GBP', 'British Pound', '£', 2),
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2)
ON CONFLICT ("code") DO NOTHING;

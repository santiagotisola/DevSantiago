ALTER TABLE "condominium_users"
DROP CONSTRAINT "condominium_users_unitId_fkey";

ALTER TABLE "condominium_users"
ADD CONSTRAINT "condominium_users_unitId_fkey"
FOREIGN KEY ("unitId") REFERENCES "units"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "condominium_users"
ADD CONSTRAINT "condominium_users_resident_requires_unit"
CHECK ("role" <> 'RESIDENT' OR "unitId" IS NOT NULL);

CREATE OR REPLACE FUNCTION validate_condominium_user_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."unitId" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "units" u
    WHERE u."id" = NEW."unitId"
      AND u."condominiumId" = NEW."condominiumId"
  ) THEN
    RAISE EXCEPTION 'Unit does not belong to condominium';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER condominium_users_validate_unit
BEFORE INSERT OR UPDATE ON "condominium_users"
FOR EACH ROW
EXECUTE FUNCTION validate_condominium_user_unit();

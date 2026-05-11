-- Adiciona FKs em invitations para condominium e unit. Os colunas já existem;
-- estavam sem constraint porque o model Invitation não declarava as relations.

ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_condominiumId_fkey"
    FOREIGN KEY ("condominiumId") REFERENCES "condominiums"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

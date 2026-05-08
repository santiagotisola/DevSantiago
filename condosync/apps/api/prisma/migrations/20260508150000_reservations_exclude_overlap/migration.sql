-- Constraint EXCLUDE USING GIST que IMPEDE no nível do banco que
-- duas reservas ATIVAS (não canceladas/rejeitadas) na mesma área
-- comum tenham intervalos sobrepostos. Sem isso, há race entre
-- a leitura de "está livre?" e o INSERT — duas requisições simul-
-- tâneas reservavam o mesmo slot.
--
-- Requer extensão btree_gist (combina igualdade btree com range gist).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Postgres não permite EXCLUDE em range derivado de duas colunas
-- via expressão diretamente — solução é uma generated column ou
-- expression index. Usamos tstzrange(startDate, endDate, '[)').
ALTER TABLE "reservations"
    ADD CONSTRAINT "reservations_no_overlap"
    EXCLUDE USING GIST (
        "commonAreaId" WITH =,
        tstzrange("startDate", "endDate", '[)') WITH &&
    )
    WHERE ("status" IN ('PENDING', 'CONFIRMED'));

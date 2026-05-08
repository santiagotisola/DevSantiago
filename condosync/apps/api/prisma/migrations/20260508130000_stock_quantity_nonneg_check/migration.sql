-- Garante invariante de estoque não-negativo no banco. Combinada
-- com decrement atômico em src/modules/stock/stock.routes.ts, esta
-- constraint elimina lost-update entre OUTs concorrentes.
ALTER TABLE "stock_items"
    ADD CONSTRAINT "stock_quantity_nonneg" CHECK ("quantity" >= 0);

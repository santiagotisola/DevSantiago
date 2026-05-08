/**
 * ESLint config oficial — backend.
 *
 * Regras arquiteturais reforçam decisões dos ADRs (em especial
 * ADR-0005 bounded contexts):
 *  - Services NÃO importam @prisma/client. Apenas repos.
 *  - Sub-services NÃO importam de outro sub-service horizontal-
 *    mente. Apenas orchestrators (billing, etc).
 *  - Routes NÃO importam de outros módulos diretamente. Via
 *    services públicos.
 *
 * Ainda warn-only em paths legados; flip para error em
 * src/modules/finance/domain/* e código novo.
 */
module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  ignorePatterns: ["dist", "node_modules", "*.js", "prisma/migrations"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "off",

    // ─── Architectural boundaries (ADR-0005) ──────────────────
    // Forbid Prisma fora de paths permitidos.
    // Prisma client é PERMITIDO em:
    //   - src/config/prisma.ts (singleton)
    //   - src/modules/**/*.repo.ts (repository implementations)
    //   - src/test/** (mocks)
    //   - paths legacy: services ainda não migrados (warn-only por ora).
    "no-restricted-imports": [
      "warn",
      {
        paths: [
          {
            name: "@prisma/client",
            importNames: ["PrismaClient"],
            message:
              "Use o singleton em '../../config/prisma' OU encapsule em <module>.repo.ts. Ver ADR-0005.",
          },
        ],
      },
    ],
  },
  overrides: [
    // Code novo (bounded contexts migrados): regras estritas.
    {
      files: ["src/modules/finance/domain/**/*.ts"],
      rules: {
        // Em domain/* services NÃO podem importar Prisma direto
        // (apenas via repo). Erro hard.
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@prisma/client",
                importNames: ["PrismaClient", "Prisma"],
                message:
                  "Code em domain/* deve usar repositories. Importe Prisma APENAS em *.repo.ts.",
              },
            ],
            patterns: [
              {
                group: ["**/config/prisma"],
                message:
                  "domain/<context>/*.service.ts não importa prisma. Use o repo do próprio context.",
              },
            ],
          },
        ],
        "@typescript-eslint/no-explicit-any": "error",
      },
    },
    // Em *.repo.ts, Prisma é permitido SEM restrição.
    {
      files: ["src/modules/**/*.repo.ts", "src/config/prisma.ts"],
      rules: {
        "no-restricted-imports": "off",
      },
    },
    // Routes não podem importar repos diretamente — sempre via service.
    {
      files: ["src/modules/**/*.routes.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["**/*.repo", "**/*.repo.ts"],
                message:
                  "Route NÃO importa repository. Use o service público do módulo.",
              },
            ],
          },
        ],
      },
    },
    // Tests podem importar qualquer coisa.
    {
      files: ["src/test/**", "**/*.test.ts", "**/*.it.test.ts"],
      rules: {
        "no-restricted-imports": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },
  ],
};

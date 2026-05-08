/**
 * Plop generator — scaffolding oficial da plataforma.
 *
 * Uso:
 *   npx plop                          # menu interativo
 *   npx plop bounded-context <nome>   # novo sub-context finance/<nome>
 *   npx plop module <nome>            # módulo CRUD novo (auth/role/etc)
 *
 * Garante consistência: todo módulo novo tem mesma estrutura,
 * convenção de nome, imports, etc. Reduz onboarding e drift.
 */
module.exports = function (plop) {
  /**
   * 1. bounded-context: cria src/modules/finance/domain/<name>/
   *    com repo + service + types + index.
   */
  plop.setGenerator("bounded-context", {
    description: "Novo sub-context dentro de domain finance",
    prompts: [
      {
        type: "input",
        name: "name",
        message:
          "Nome do bounded context (ex: ratios, billing, reconciliation):",
        validate: (v) =>
          /^[a-z][a-z0-9-]*$/.test(v) ||
          "kebab-case, lowercase, começar com letra",
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/modules/finance/domain/{{name}}/{{name}}.repo.ts",
        templateFile: ".plop/bounded-context.repo.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/finance/domain/{{name}}/{{name}}.service.ts",
        templateFile: ".plop/bounded-context.service.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/finance/domain/{{name}}/types.ts",
        templateFile: ".plop/bounded-context.types.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/finance/domain/{{name}}/{{name}}.service.test.ts",
        templateFile: ".plop/bounded-context.test.ts.hbs",
      },
    ],
  });

  /**
   * 2. module: cria src/modules/<name>/ no template completo
   *    (routes + controller + service + repo + schemas).
   */
  plop.setGenerator("module", {
    description: "Novo módulo CRUD (routes/controller/service/repo)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "Nome do módulo (ex: announcements, occurrences):",
        validate: (v) =>
          /^[a-z][a-z0-9-]*$/.test(v) ||
          "kebab-case, lowercase, começar com letra",
      },
      {
        type: "input",
        name: "ModelName",
        message: "Nome do model Prisma (PascalCase, ex: Announcement):",
        validate: (v) => /^[A-Z][A-Za-z0-9]*$/.test(v) || "PascalCase",
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/modules/{{name}}/{{name}}.routes.ts",
        templateFile: ".plop/module.routes.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{name}}/{{name}}.controller.ts",
        templateFile: ".plop/module.controller.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{name}}/{{name}}.service.ts",
        templateFile: ".plop/module.service.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{name}}/{{name}}.repo.ts",
        templateFile: ".plop/module.repo.ts.hbs",
      },
      {
        type: "add",
        path: "src/modules/{{name}}/{{name}}.schemas.ts",
        templateFile: ".plop/module.schemas.ts.hbs",
      },
    ],
  });
};

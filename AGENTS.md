# AGENT DEVELOPMENT GUIDE

This document outlines the conventions, commands, and architectural patterns of the `sheet-regiter` project to facilitate autonomous and consistent agentic coding.

## 1. Project Overview

The project is a NestJS (Node.js/TypeScript) application designed as a backend service. It follows a standard modular architecture. All agent tasks must prioritize consistency with existing code, maintain full type safety (where exceptions are not explicitly configured), and ensure all automated quality checks pass.

## 2. Core Technologies

| Technology          | Role              | Conventions                                                                                                         |
| :------------------ | :---------------- | :------------------------------------------------------------------------------------------------------------------ |
| **NestJS**          | Primary Framework | Uses decorators, dependency injection, and a Controller-Service-Module pattern.                                     |
| **TypeScript**      | Language          | Strictly typed. Utilize interfaces and DTOs (Data Transfer Objects).                                                |
| **pnpm**            | Package Manager   | Always use `pnpm` for installing, running, and linking packages.                                                    |
| **Prisma**          | ORM/Database      | All database interactions must go through the generated Prisma Client. Schema is defined in `prisma/schema.prisma`. |
| **Jest**            | Testing Framework | Unit tests follow the pattern `*.spec.ts`. E2E tests are configured separately.                                     |
| **ESLint/Prettier** | Code Quality      | Enforce automated formatting and linting rules using the provided configurations.                                   |

## 3. Build and Command Reference

All commands must be executed using `pnpm run <script-name>`.

### 3.1. General Commands

| Script Name  | Command              | Description                                                                |
| :----------- | :------------------- | :------------------------------------------------------------------------- |
| `build`      | `nest build`         | Compiles the TypeScript source code to JavaScript in the `dist` directory. |
| `start:dev`  | `nest start --watch` | Starts the application in watch mode (hot reload).                         |
| `start:prod` | `node dist/main`     | Starts the production build.                                               |

### 3.2. Code Quality and Formatting

The project mandates adherence to ESLint and Prettier. Always run `lint` and `format` before creating a commit.

| Script Name | Command                                         | Description                                               |
| :---------- | :---------------------------------------------- | :-------------------------------------------------------- |
| `lint`      | `eslint "{src,apps,libs,test}/**/*.ts" --fix`   | Runs the linter and attempts to fix issues automatically. |
| `format`    | `prettier --write "src/**/*.ts" "test/**/*.ts"` | Runs Prettier to enforce consistent code formatting.      |

### 3.3. Testing

| Script Name     | Command                                   | Description                                                      |
| :-------------- | :---------------------------------------- | :--------------------------------------------------------------- |
| `test`          | `jest`                                    | Executes all unit and integration tests (`*.spec.ts` in `src/`). |
| `test:e2e`      | `jest --config ./test/jest-e2e.json`      | Executes all end-to-end tests (files in `test/`).                |
| **Single Test** | `pnpm run test -- <path/to/file.spec.ts>` | **How to run a single test file.**                               |

Example: `pnpm run test -- src/users/users.service.spec.ts`

## 4. Code Style and Conventions

### 4.1. TypeScript and NestJS

- **Decorators:** Utilize built-in NestJS decorators (`@Injectable()`, `@Controller()`, `@Module()`, etc.) for all components.
- **Dependency Injection:** Services and other providers must be injected via constructor injection.
- **DTOs:** Define request and response schemas using `class-validator` and `class-transformer` annotations on dedicated DTO classes.
- **Type Safety:** Explicit typing is preferred. The ESLint configuration allows `any` (`@typescript-eslint/no-explicit-any: 'off'`), but its use should be minimized and justified.

### 4.2. Naming Conventions

| Entity                 | Convention                                      | Example                                      |
| :--------------------- | :---------------------------------------------- | :------------------------------------------- |
| **Files**              | kebab-case (for modules, controllers, services) | `user.module.ts`, `auth.controller.ts`       |
| **Classes/Interfaces** | PascalCase                                      | `UsersService`, `AuthGuard`, `CreateUserDto` |
| **Variables/Methods**  | camelCase                                       | `createUser`, `getUserByEmail`               |
| **Constants (global)** | SCREAMING_SNAKE_CASE                            | `JWT_SECRET_KEY`                             |

### 4.3. Imports

- **Grouping:** Imports should be organized in blocks: (1) Node/external libraries, (2) NestJS-specific modules, (3) project-local imports (using path aliases defined in `tsconfig.json`).
- **Alias:** Always use the path aliases configured in `tsconfig.json` for internal imports to maintain clarity.

### 4.4. Error Handling and Promises

- **HTTP Errors:** Controllers should use NestJS exception filters or throw built-in HTTP exceptions (e.g., `NotFoundException`, `BadRequestException`).
- **Floating Promises:** Avoid promises that are not explicitly awaited or chained with `.catch()`. The linter warns against this (`@typescript-eslint/no-floating-promises: 'warn'`).

### 4.5. Database (Prisma)

- **Client Usage:** Inject the Prisma client into services. Do not directly access database logic in controllers.
- **Transactions:** Use Prisma's `$transaction` for any multiple-step database operations that require atomicity.

---

_End of AGENT DEVELOPMENT GUIDE. Total: ~100 lines._

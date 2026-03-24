Proyecto: aplicación interna de autenticación y gestión de usuarios para una oficina policial.

Contexto:
- Sistema cerrado, NO público.
- El registro de usuarios es controlado (no libre).
- Solo agentes autorizados pueden acceder.
- No hay validación contra APIs externas oficiales.
- La seguridad se basa en control interno, roles y flujos restringidos.

Arquitectura:
- Backend en Node.js + TypeScript con NestJS.
- Arquitectura modular inspirada en Clean Architecture / DDD.
- Separación por capas: api (controllers), application (services/interfaces), domain (entidades), infrastructure (repositorios/DB).

Auth:
- Login con JWT.
- Registro solo por admin o flujo controlado.
- Roles (ej: ADMIN, AGENT).

No explicar conceptos básicos de programación.
Ignorar archivos de build, dependencias y tests.
Asumir que el lector entiende Node.js y TypeScript.

# Registro de Expedientes

Aplicación interna de una oficina de la Policía Federal Argentina para registrar y consultar los movimientos de expedientes GDE. Reemplaza una planilla compartida.

- [Qué hace](#qué-hace)
- [Instalación en el servidor (Linux)](#instalación-en-el-servidor-linux)
- [Primer administrador](#primer-administrador)
- [Copias de seguridad](#copias-de-seguridad)
- [Restaurar la base](#restaurar-la-base)
- [Importar la planilla histórica](#importar-la-planilla-histórica)
- [Operación diaria](#operación-diaria)
- [Desarrollo local](#desarrollo-local)

## Qué hace

Cada fila es un **movimiento** (el mismo `EX` puede aparecer varias veces): Fecha, EX, IF, Motivo, Repartición y Pase (opcional).

| | Usuario | Administrador |
|---|---|---|
| Buscar y ver todos los registros, ver su historial | ✔ | ✔ |
| Crear registros | ✔ | ✔ |
| Editar y eliminar | solo los propios | todos |
| Exportar e importar planillas | | ✔ |
| Gestionar usuarios | | ✔ |

Nada se borra definitivamente: eliminar oculta el registro, y cada alta, cambio y baja queda en un historial que no se puede modificar.

### Componentes

```
navegador ──HTTP──▶ frontend (Nginx, puerto 80) ──/api──▶ backend (NestJS) ──▶ db (PostgreSQL 16)
```

Los tres corren en contenedores. La base y el backend están en una red interna **sin salida a internet** y no se publican en la red de la oficina; solo Nginx.

---

## Instalación en el servidor (Linux)

### Requisitos

- Linux de 64 bits con **Docker Engine** y el plugin **Docker Compose v2** (`docker compose version`).
- Que Docker arranque con el equipo: `sudo systemctl enable --now docker`.
- Un usuario con permiso para usar Docker (`sudo usermod -aG docker $USER` y volver a iniciar sesión).
- Internet **solo para construir las imágenes** (ver [sin internet](#servidor-sin-internet)).

### Pasos

```bash
git clone <repositorio> office-registry && cd office-registry
cp .env.example .env
chmod 600 .env
```

Completar en `.env` las dos variables obligatorias:

```bash
openssl rand -hex 24    # pegar en POSTGRES_PASSWORD
openssl rand -hex 48    # pegar en JWT_SECRET
```

Construir y levantar:

```bash
docker compose up -d --build
docker compose ps        # los tres servicios deben figurar "healthy"
```

La aplicación queda en `http://<IP-del-servidor>/`. Las migraciones de la base se aplican solas al iniciar el backend. Conviene fijar la IP del servidor en el router.

> **Importante:** la conexión es **HTTP sin cifrar**: las contraseñas viajan en claro por la red local. Usar solo en una red interna de confianza y nunca exponer el equipo a internet. Para cifrar hace falta un certificado y configurar HTTPS en Nginx.

> **Firewall:** los puertos publicados por Docker no respetan las reglas de `ufw`. Para limitar quién accede, usar `HTTP_BIND` en `.env` o reglas en la cadena `DOCKER-USER`.

### Servidor sin internet

Construir en otra computadora (misma arquitectura, normalmente x86-64) y trasladar las imágenes:

```bash
# En la computadora con internet, dentro del repositorio
cp .env.example .env     # poner cualquier valor en POSTGRES_PASSWORD y JWT_SECRET
docker compose build
docker pull postgres:16-alpine
docker save office-registry-backend office-registry-frontend postgres:16-alpine | gzip > imagenes.tar.gz

# En el servidor (con el repositorio copiado y su propio .env)
gunzip -c imagenes.tar.gz | docker load
docker compose up -d --no-build
```

---

## Primer administrador

Se crea una sola vez, con el sistema levantado:

```bash
read -rsp 'Contraseña inicial: ' SEED_ADMIN_PASSWORD; echo
export SEED_ADMIN_PASSWORD

docker compose exec \
  -e SEED_ADMIN_PASSWORD \
  -e SEED_ADMIN_USERNAME=admin \
  -e SEED_ADMIN_NAME="Nombre y Apellido" \
  -e SEED_ADMIN_DNI=12345678 \
  backend node seed/seed.js

unset SEED_ADMIN_PASSWORD
```

Al primer ingreso el sistema obliga a cambiar la contraseña. Si el usuario ya existe, el comando no hace nada.

**Crear un segundo administrador** desde *Usuarios*: nadie puede restablecer su propia contraseña desde esa pantalla, y si el único administrador la olvida no hay forma de recuperarla desde la aplicación.

### Escudo institucional

Para mostrarlo, copiar la imagen oficial a `frontend/public/logo-pfa.png` antes de construir. Sin ella se muestra "PFA".

---

## Copias de seguridad

```bash
bash scripts/backup-db.sh
```

Crea `backups/registry-AAAAMMDD-HHMMSS.dump`, verifica que se pueda leer y conserva las **30 más recientes** (`BACKUP_KEEP`). La carpeta se cambia con `BACKUP_DIR`.

### Copia automática cada noche (cron)

```bash
mkdir -p /ruta/a/office-registry/backups
crontab -e
```

Agregar (ajustando la ruta, y eligiendo una hora en la que el equipo esté encendido: cron no recupera las que se perdieron):

```cron
0 2 * * * /usr/bin/bash /ruta/a/office-registry/scripts/backup-db.sh >> /ruta/a/office-registry/backups/backup.log 2>&1
```

Al día siguiente, revisar `backups/backup.log`.

> **Copiar las copias fuera del equipo** (disco externo u otro servidor) periódicamente: si se rompe el disco, se pierden la base y las copias juntas. Los archivos contienen todos los registros y los usuarios: guardarlos con el mismo cuidado.

El archivo `.env` no está en las copias: guardar una copia aparte, en un lugar seguro.

---

## Restaurar la base

**Reemplaza todos los datos actuales** por los de la copia elegida. Con el sistema levantado:

```bash
ls -lh backups/
bash scripts/restore-db.sh backups/registry-AAAAMMDD-HHMMSS.dump
```

El script:

1. comprueba que el archivo sea una copia válida;
2. pide escribir `RESTAURAR`;
3. guarda el estado actual en `backups/pre-restore-*.dump` (no se borra solo);
4. restaura en una base aparte y, solo si todo salió bien, reemplaza la actual;
5. reinicia la aplicación.

Si la restauración falla, la base en uso queda como estaba.

**En un equipo nuevo:** instalar siguiendo los pasos de arriba (sin crear el administrador), copiar el `.dump` y ejecutar el mismo comando.

---

## Importar la planilla histórica

Solo administradores: **Expedientes → Importar planilla**.

- Archivo `.xlsx` o `.csv`, hasta **5 MB** y 20.000 filas. Se lee la primera hoja.
- La primera fila con contenido son los encabezados: `Fecha`, `EX`, `IF`, `Motivo`, `Repartición`, `Pase`. No importan las mayúsculas ni los acentos; las columnas de más se ignoran.
- Fecha: celda de fecha, `dd/mm/aaaa` o `aaaa-mm-dd`.
- `EX` debe empezar con `EX-año-número-` e `IF` con `IF-año-número-`.
- `Pase` vacío o `---` queda sin pase.

Al elegir el archivo se muestra una **vista previa** con los errores por fila; nada se guarda hasta confirmar. Se importan las filas válidas y se omiten las que tienen errores: corregirlas y cargarlas **en un archivo aparte**, para no repetir las ya importadas. La vista previa avisa si hay filas que ya están en el sistema.

Antes de una importación grande, hacer una copia de seguridad.

**Exportar** descarga los registros que coinciden con la búsqueda y las fechas elegidas, en Excel o CSV (separado por `;`).

---

## Operación diaria

| Tarea | Comando |
|---|---|
| Ver estado | `docker compose ps` |
| Ver registros de actividad | `docker compose logs -f backend` |
| Reiniciar | `docker compose restart` |
| Detener / volver a levantar | `docker compose down` / `docker compose up -d` |
| Actualizar | `bash scripts/backup-db.sh && git pull && docker compose up -d --build` |

> `docker compose down -v` **borra la base de datos**. No usar `-v`.

Opciones de `.env` (aplicar con `docker compose up -d`):

| Variable | Por defecto | Uso |
|---|---|---|
| `HTTP_PORT` / `HTTP_BIND` | `80` / `0.0.0.0` | Dónde se publica la web |
| `JWT_EXPIRES_IN` | `8h` | Duración de la sesión |
| `LOGIN_THROTTLE_LIMIT` / `..._TTL_SECONDS` | `5` / `60` | Intentos de ingreso por equipo |
| `TZ` | `America/Argentina/Buenos_Aires` | Zona horaria |

Para que los selectores de fecha muestren `dd/mm/aaaa`, el navegador de cada puesto debe estar en español.

Si hay otro proxy delante de Nginx, todos los equipos compartirán el límite de intentos de ingreso: hay que ajustar `frontend/nginx/default.conf` y `TRUST_PROXY`.

---

## Desarrollo local

Requisitos: Node 22 o superior, **pnpm 10** (`npx pnpm@10 …` si el global es anterior) y Docker.

```bash
# API
cd backend
cp .env.example .env      # completar JWT_SECRET, POSTGRES_PASSWORD, DATABASE_URL, SEED_ADMIN_PASSWORD
docker compose up -d --wait        # base de DESARROLLO (proyecto y volumen propios)
pnpm install
pnpm db:deploy && pnpm db:generate
pnpm db:seed
pnpm start:dev            # http://localhost:3000/api  (Swagger en /api/docs)

# Web, en otra terminal
cd frontend
pnpm install
pnpm dev                  # http://localhost:5173, con /api redirigido al puerto 3000
```

En `DATABASE_URL` usar `127.0.0.1`, no `localhost`. Si el puerto 5432 está ocupado, cambiar `POSTGRES_PORT` y la URL.

### Verificaciones

| | `backend/` | `frontend/` |
|---|---|---|
| Tipos | `pnpm typecheck` | `pnpm typecheck` |
| Lint | `pnpm lint:check` | `pnpm lint` |
| Compilar | `pnpm build` | `pnpm build` |
| Pruebas | `pnpm test`, `pnpm test:e2e` | `pnpm test` |

`test:e2e` usa una base separada (`<nombre>_test`) que crea y migra sola.

### Estructura

```
backend/    NestJS + Prisma      (src/modules/{auth,records,users}, prisma/)
frontend/   React + Vite         (src/features/{auth,records,users}), nginx/
scripts/    copia y restauración de la base
docs/       revisión inicial, bocetos y registro de cada fase (docs/logs/)
```

Convenciones y reglas del dominio: [`CLAUDE.md`](CLAUDE.md). Historial de la implementación: [`docs/logs/INDEX.md`](docs/logs/INDEX.md).

# Time Manager — Especificaciones para Claude Code
**Versión de referencia:** v11.21.1 · `app.timemanagerweb.com`  
**Fecha de levantamiento:** Mayo 2026  
**Stack sugerido:** React + TypeScript · TailwindCSS · Node.js/Express · PostgreSQL

---

## 1. Visión general

Aplicación web SPA de gestión de tiempo para firmas de servicios profesionales (legal, consultoría). Permite registrar horas trabajadas por cliente y asunto, gestionar tareas, procesar aprobaciones y emitir documentos de facturación.

**Paleta de colores:** Verde teal primario `#00897B`, fondo blanco, texto gris oscuro.  
**Patrón UI:** Sidebar de íconos colapsable izquierdo + header fijo + contenido principal con tablas paginadas y modales para formularios.

---

## 2. Entidades del modelo de datos

### 2.1 Cliente
```
id              INT PK autoincrement
codigo          VARCHAR(10) UNIQUE  -- ej: "000001"
razon_social    VARCHAR(255) NOT NULL
nombre_comercial VARCHAR(255)
tipo_documento  ENUM('CC','NIT','Pasaporte','RUT', ...)
numero_documento VARCHAR(50)
pais            VARCHAR(100)
ciudad          VARCHAR(100)
sector          VARCHAR(100)
tipo            VARCHAR(100)        -- tipo de cliente
responsable_id  FK → usuarios
emisor_facturacion_id FK → usuarios
grupo_empresarial_id FK → grupos_empresariales (nullable)
estado          ENUM('Activo','Inactivo') DEFAULT 'Activo'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### 2.2 Asunto (Matter)
```
id              INT PK autoincrement
codigo          VARCHAR(20) UNIQUE  -- ej: "000001-0001"
cliente_id      FK → clientes
nombre          VARCHAR(255) NOT NULL  -- ej: "General Legal Advisory"
area_practica_id FK → areas_practica
tipo_facturacion ENUM('Por Horas','Por Horas Con Monto Editable','Por Hitos o Etapas','Monto Fijo Mensual')
moneda          ENUM('COP','USD','EUR')
monto_fijo      DECIMAL(15,2) nullable  -- si tipo = Monto Fijo Mensual
grupo_facturacion_id FK → grupos_facturacion (nullable)
estado          ENUM('Activo','Inactivo','Cerrado') DEFAULT 'Activo'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### 2.3 Tiempo (Time Entry)
```
id              INT PK autoincrement
usuario_id      FK → usuarios NOT NULL
cliente_id      FK → clientes NOT NULL
asunto_id       FK → asuntos NOT NULL
actividad       TEXT NOT NULL         -- descripción de la actividad
fecha           DATE NOT NULL
duracion_horas  INT NOT NULL          -- en minutos internamente
facturable      BOOLEAN DEFAULT TRUE
compartido_con  FK → usuarios nullable
estado          ENUM('Activo','Aprobado','Facturado','Facturado (Pagado)') DEFAULT 'Activo'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### 2.4 Tarea
```
id              INT PK autoincrement
titulo          VARCHAR(255) NOT NULL
usuario_id      FK → usuarios NOT NULL
cliente_id      FK → clientes NOT NULL
asunto_id       FK → asuntos NOT NULL
detalles        TEXT NOT NULL
fecha_inicio    DATE
fecha_vencimiento DATE
importancia     ENUM('!','!!','!!!') nullable
estimado_minutos INT DEFAULT 0
finalizada      BOOLEAN DEFAULT FALSE
archivada       BOOLEAN DEFAULT FALSE
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### 2.5 Usuario
```
id              INT PK autoincrement
nombre          VARCHAR(255) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
categoria_id    FK → categorias_usuario
rol_id          FK → roles
area_practica_id FK → areas_practica
tarifa_horaria  DECIMAL(10,2) nullable
estado          ENUM('Activo','Inactivo') DEFAULT 'Activo'
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### 2.6 Job
```
id              INT PK autoincrement
nombre          VARCHAR(255) NOT NULL
responsable_id  FK → usuarios
cliente_id      FK → clientes
tipo            VARCHAR(100)
estado          ENUM('Activo','Cerrado','Pausado')
created_at      TIMESTAMP
```

### 2.7 Documento de Facturación
```
id              INT PK autoincrement
tipo_documento  ENUM('Factura','Nota débito','Nota crédito', ...)
receptor_id     FK → clientes
emisor_id       FK → usuarios
asunto_id       FK → asuntos nullable
rango_fecha_inicio DATE
rango_fecha_fin    DATE
valor           DECIMAL(15,2)
moneda          ENUM('COP','USD','EUR')
impuesto_id     FK → impuestos nullable
gravamen_id     FK → gravamenes nullable
tasa_cambio_id  FK → tasas_cambio nullable
estado          ENUM('Borrador','Emitido','Pagado','Anulado')
created_at      TIMESTAMP
```

### 2.8 Pago
```
id              INT PK autoincrement
cliente_id      FK → clientes NOT NULL
documento_id    FK → documentos_facturacion nullable
monto           DECIMAL(15,2) NOT NULL
moneda          ENUM('COP','USD','EUR')
fecha_pago      DATE NOT NULL
estado          ENUM('Pendiente','Aplicado')
created_at      TIMESTAMP
```

### 2.9 Tablas de configuración
- `roles` (id, nombre, permisos JSON)
- `categorias_usuario` (id, nombre)
- `areas_practica` (id, nombre)
- `ausencias` (id, usuario_id, fecha_inicio, fecha_fin, tipo, descripcion)
- `grupos_empresariales` (id, nombre)
- `grupos_facturacion` (id, nombre)
- `impuestos` (id, nombre, porcentaje)
- `gravamenes` (id, nombre, valor)
- `tasas_cambio` (id, moneda_origen, moneda_destino, tasa, fecha_vigencia)
- `periodos_facturacion` (id, nombre, fecha_inicio, fecha_fin)
- `tarifas_horarias` (id, usuario_id OR categoria_id, cliente_id nullable, valor, moneda)

---

## 3. Módulos y pantallas

### 3.1 Inicio (Dashboard) — `/`
**Componentes:**
- Panel lateral izquierdo "Tareas Activas": lista de tareas pendientes del usuario logueado con timer en tiempo real (formato `0:00` verde)
- 3 KPI cards:
  - **Tareas:** contador de tareas activas con filtro (Activas / Todas / Finalizadas)
  - **Ejecución de Tiempo Estimado:** % ejecutado/estimado con selector de período (último mes, última semana, etc.)
  - **Capacidad Instalada:** % estimado/disponible con selector de período
- Gráfico de torta: "Top 5 Clientes con Más Tiempo Registrado" — con selector de período
- Gráfico de barras: "Horas Registradas y Metas" — barras apiladas (horas facturables / no facturables / meta) por día — con selector de período

### 3.2 Tareas — `/tasks`
**Tabs superiores:** Listas | Proyectos

**Filtros laterales (sidebar):**
- Todas
- Activas
- Por vencimiento
- Asignadas a mí
- Por importancia
- Cronometradas
- Archivadas
- Finalizadas

**Vistas del contenido:** Lista | Capacidad | Kanban

**Filtros de barra:** Clientes/Asuntos (multiselect) · Participantes (multiselect) · Mis clientes (toggle) · Buscador

**Tabla Lista — columnas:**
| Columna | Tipo |
|---------|------|
| Checkbox completar | toggle circular |
| Título tarea | texto link |
| Cliente | texto |
| Asunto | texto (código + nombre) |
| Inicio | fecha (rojo si vencida) |
| Vencimiento | fecha (rojo si vencida) |
| Importancia | íconos `!` `!!` `!!!` |
| Participantes | avatar/nombre |
| Estimado | `H:MM` |
| Tiempo registrado | `H:MM +` (botón para registrar tiempo rápido) |
| Acciones | `···` menú |

**Modal Tarea Nueva — campos:**
- Título * (text input)
- Usuario * (select — pre-selecciona usuario logueado)
- Cliente * (select — carga asuntos al seleccionar)
- Asunto * (select dependiente de cliente)
- Detalles * (textarea)
- Fecha de inicio (date picker)
- Fecha de vencimiento (date picker)
- Importancia (selector `!` / `!!` / `!!!`)
- Estimado (input numérico con botones: +1h, +30min, +10min, +5min, +1min, Limpiar)

**Botones:** Cancelar | Crear Tarea

### 3.3 Tiempos — `/times`
**Vistas:** Lista | Calendario | Interacciones AI

**Filtros de barra:** Cliente · Asunto · Estado · Facturable · Fecha · Toggle "Mostrar tiempos de todos"

**Tabla — columnas:**
| Cliente | Asunto | Actividad | Fecha | Tiempo | Facturable | Estado | Acciones `···` |

**Estados posibles:** Activo · Aprobado · Facturado · Facturado (Pagado)

**Facturable:** ícono `$` verde (sí) o `$` tachado gris (no)

**Exportar:** PDF · XLS

**Modal Tiempo Nuevo — campos:**
- Entrada por voz AI (botón micrófono — "relate: cliente, asunto, fecha, tiempo, descripción")
- Usuario * (select)
- Cliente * (select)
- Asunto * (select dependiente)
- Fecha * (date picker — default hoy)
- Duración * (input HH:MM con spinners ▲▼)
- Descripción * (textarea)
- Facturable (toggle Sí/No — default Sí)
- Compartir (select usuario)

**Botones:** Cancelar | Guardar

**Vista Calendario:** visualización mensual/semanal de tiempos registrados

**Vista Interacciones AI:** historial de tiempos creados vía voz

### 3.4 Gestión del WIP — `/wip-management`
Maestro de clientes con vista expandible inline de sus asuntos.

**Filtros de barra (2 filas):**
Fila 1: Cliente · Emisor de facturación · Código · Tipo de documento · Número de documento · Creado · Actualizado · Sector  
Fila 2: Responsable · Tipo · Estado · Grupo empresarial asociado · Buscador

**Tabla clientes — columnas:**
| ▶ expand | Id | Código | Razón social | Nombre Comercial | País | Ciudad | Fecha creación | Fecha edición | Estado | `···` |

**Al expandir fila — tabla de asuntos del cliente:**

Filtros inline: Usuarios · Asunto · Área de práctica · Facturable · Rango de fechas · Tipo de facturación · Estado Asunto/Hito · Estado tiempos/gastos · Gastos/Tiempos · Grupo de facturación

Columnas asuntos:
| checkbox | ID | Asunto (código + nombre) | Facturación (tipo + ícono) | Moneda | Facturable (H:MM) | Valor tiempos | Valor gastos | Total facturable | Estado | ℹ️ |

Botón acción: **Facturar** (crea documento de facturación desde los asuntos seleccionados)

**Acción principal:** + Nuevo cliente

### 3.5 Facturación — submenú con 5 secciones

#### 3.5.1 Aprobación — `/business-approval`
Flujo de aprobación de tiempos/gastos antes de facturar.

**Filtros:** Usuarios · 1er aprobador · 2do aprobador · Cliente · Asunto · Área de práctica · Facturable · Rango de fechas · Tipo de facturación · Estado Asunto/Hito · Estado tiempos/gastos · Gastos/Tiempos

**Tabla — columnas:**
| ▶ | checkbox | ID | Cliente | Asunto | Facturación (tipo) | Moneda | Facturable (H:MM) | Valor tiempos | Valor gastos | Total facturable | Estado | ℹ️ |

**Estados:** Activo · Aprobado · Rechazado

#### 3.5.2 Objetos Facturables — `/billable-objects`
Agrupación de tiempos aprobados listos para generar documentos.

**Filtros:** Usuarios · Cliente · Asunto · Área de práctica · Rango de fechas · Tipo de facturación · Estado · Responsable · Creado Por · Gastos/Tiempos

**Tabla — columnas:**
| ▶ | checkbox | Cliente | Asunto | Id | Modo de facturación | Responsable/Creador | Estado | Fecha | Valor | Moneda |

**Modos de facturación:** Por Horas · Por Horas Con Monto Editable · Por Hitos o Etapas · Monto Fijo Mensual

#### 3.5.3 Dashboard de Facturación — `/billing-dashboard`
**Tabs:** Aprobación | Podio

- **Aprobación:** tabla resumen de tiempos/gastos pendientes por aprobador. Filtros: 1er aprobador, 2do aprobador, Cliente, Asunto, Rango de fechas. Export XLS.
- **Podio:** ranking de usuarios por horas facturadas (período seleccionable)

#### 3.5.4 Jobs — `/jobs`
Gestión de proyectos/trabajos agrupadores.

**Sidebar:** Mis jobs  
**Filtros:** Responsable · Cliente · Tipo · Estado  
**Panel derecho:** detalle del job seleccionado  
**Acción:** Crear job

#### 3.5.5 Facturación — `/billing/list`
Emisión y gestión de documentos de facturación.

**Tabs:** Documentos | Tasas de cambio | Impuestos | Gravámenes

**Tab Documentos — filtros:** Receptor · Asunto · Emisor · Rango de fechas · Tipo de documento · Estado  
**Columnas:** Receptor · Asunto · Emisor · Fecha · Tipo · Valor · Moneda · Estado · Acciones  
**Acción:** + Crear documento  
**Export:** XLS

#### 3.5.6 Pagos — `/payment/payments`
**Tab:** Pagos  
**Filtros:** Cliente · Rango de fechas · Estado  
**Acción:** + Crear pago

### 3.6 Ajustes — submenú

#### 3.6.1 Usuarios — `/security/users`
**Tabs:** Usuarios | Roles | Categorías | Área de práctica | Ausencias

**Tab Usuarios — filtros:** Categoría · Roles · Fecha de creación · Estado · Área de práctica · Buscador  
**Acción:** + Crear Usuario  
**Export:** XLS

**Tab Roles:** CRUD de roles con asignación de permisos por módulo

**Tab Categorías:** CRUD de categorías de usuario (ej: Socio, Abogado Senior, Paralegal)

**Tab Área de práctica:** CRUD (ej: Real Estate, Visa application, General Legal Advisory, Civil Trust, Citizenship)

**Tab Ausencias:** registro de vacaciones/permisos por usuario. Columnas: Usuario · Fecha inicio · Fecha fin · Tipo · Descripción

#### 3.6.2 Clientes — configuración de clientes maestros
#### 3.6.3 Tarifas horarias — tarifa por usuario/categoría/cliente
#### 3.6.4 Periodos de facturación — definición de períodos
#### 3.6.5 Tasas de cambio — COP/USD/EUR histórico

---

## 4. Navegación global

### Header (top bar)
- ℹ️ Info / notificaciones del sistema
- 👤 Perfil de usuario
- 🔔 Notificaciones (badge con contador — 1809 en referencia)
- ➕ FAB global: despliega acceso rápido a crear → Tarea | Tiempo | Gastos | Cliente | Asunto | Cronómetro

### Sidebar izquierdo (íconos, colapsable)
```
🏠  Inicio          /
📋  Tareas          /tasks
🕐  Tiempos         /times
💵  WIP             /wip-management
📄  Facturación     (submenú)
      Aprobación
      Objetos facturables
      Dashboard
      Jobs
      Facturación
      Pagos
📁  [no usar]
⚙️  Ajustes         (submenú)
      Usuarios
      Clientes
      Tarifas horarias
      Periodos de facturación
      Tasas de cambio
```

---

## 5. Funcionalidades transversales

### 5.1 Timer / Cronómetro en tiempo real
- Desde el dashboard: cada tarea activa muestra timer `0:00` en verde
- FAB global → Cronómetro: inicia timer asociado a cliente + asunto
- Al detener: crea automáticamente un registro de Tiempo

### 5.2 Entrada de tiempo por voz (AI)
- Modal "Tiempo Nuevo" incluye botón micrófono
- Usuario habla: "nombre del cliente, asunto, fecha, tiempo a reportar y descripción"
- AI (Open Atlas) transcribe y auto-rellena el formulario

### 5.3 Paginación estándar
- 10 registros por página (configurable)
- Paginación numérica con `...` para rangos largos
- Contador "X Registros" visible

### 5.4 Exportación
- PDF y XLS disponibles en Tiempos y Aprobación
- XLS disponible en WIP, Usuarios, Objetos facturables, Facturación

### 5.5 Filtros persistentes
- Los filtros activos se muestran resaltados en teal
- Botón "Limpiar filtros" / ✕ para resetear
- Botón Refrescar (↺) para recargar datos

### 5.6 Acciones en tabla (`···`)
- Menú de 3 puntos por fila con acciones contextuales (editar, archivar, eliminar, etc.)

### 5.7 Selección múltiple (bulk actions)
- Checkboxes por fila
- En Tareas: botón "Múltiples Tareas" para acciones en lote
- En WIP/Aprobación: seleccionar varios asuntos → botón "Facturar"

---

## 6. Reglas de negocio clave

1. **Jerarquía:** Cliente → Asunto → Tiempo/Tarea. No puede existir un Tiempo sin Cliente y Asunto.
2. **Flujo de facturación:**
   - Tiempo registrado (Estado: Activo)
   - → Aprobación (1er y 2do aprobador)
   - → Estado: Aprobado
   - → Aparece en Objetos Facturables
   - → Se genera Documento de Facturación
   - → Se registra Pago
   - → Estado: Facturado (Pagado)
3. **Tipos de facturación:** determinan cómo se calcula el valor del asunto:
   - *Por Horas:* valor = horas × tarifa
   - *Por Horas Con Monto Editable:* similar pero el monto es editable manualmente
   - *Por Hitos o Etapas:* valor fijo por hito completado
   - *Monto Fijo Mensual:* valor fijo mensual independiente de horas
4. **Facturable vs No facturable:** cada tiempo puede marcarse como no facturable (ej: reuniones internas). No aparece en el cálculo de valor.
5. **Importancia en tareas:** 3 niveles (!  !!  !!!) — visual con íconos de exclamación
6. **Multi-moneda:** COP, USD, EUR. Tasas de cambio configurables con fecha de vigencia.
7. **Permisos:** rol-based. Administrador ve tiempos de todos ("Mostrar tiempos de todos"). Usuario normal ve solo los suyos.
8. **Código de cliente:** formato `000001` (6 dígitos con ceros). Código de asunto: `CLIENTE-0001` (ej: `000001-0001`).

---

## 7. Stack técnico sugerido

### Frontend
- **Framework:** React 18 + TypeScript
- **Estilos:** TailwindCSS + componentes propios (no usar UI kit genérico para respetar el diseño)
- **Routing:** React Router v6
- **Estado global:** Zustand o Context API
- **Tablas:** TanStack Table v8
- **Gráficos:** Recharts
- **Formularios:** React Hook Form + Zod
- **Fechas:** date-fns
- **HTTP:** Axios o TanStack Query

### Backend
- **Runtime:** Node.js + Express o Fastify
- **ORM:** Prisma
- **Base de datos:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Validación:** Zod

### Estructura de carpetas sugerida (frontend)
```
src/
  components/
    layout/         # Sidebar, Header, Layout
    ui/             # Button, Modal, Table, Badge, etc.
    forms/          # FormTiempo, FormTarea, etc.
  pages/
    dashboard/
    tasks/
    times/
    wip/
    billing/
      approval/
      billable-objects/
      dashboard/
      jobs/
      invoices/
      payments/
    settings/
      users/
  hooks/            # useTimer, useFilters, usePagination
  store/            # Zustand stores
  services/         # API calls
  types/            # TypeScript interfaces
  utils/
```

---

## 8. Orden de implementación sugerido

**Fase 1 — Base**
1. Auth (login, JWT, roles)
2. Modelo de datos completo (migraciones)
3. CRUD Usuarios + Ajustes básicos
4. CRUD Clientes (WIP)
5. CRUD Asuntos

**Fase 2 — Core operativo**
6. Registro de Tiempos (formulario manual)
7. Gestión de Tareas (lista, kanban, vistas)
8. Dashboard (KPIs + gráficos)
9. Timer en tiempo real

**Fase 3 — Facturación**
10. Módulo Aprobación
11. Objetos Facturables
12. Documentos de Facturación
13. Pagos
14. Jobs

**Fase 4 — Avanzado**
15. Entrada de tiempo por voz (Web Speech API + AI)
16. Exportación PDF/XLS
17. Dashboard de Facturación (Aprobación + Podio)
18. Vista Calendario en Tiempos

---

*Documento generado por análisis directo de la aplicación Time Manager v11.21.1*

# EcoRAEE Cloud – Parte II: Desarrollo Local Integrado

Plataforma para la gestión, trazabilidad de extremo a extremo y optimización logística de Residuos de Aparatos Eléctricos y Electrónicos (**RAEE**) bajo un modelo de economía circular.

> **Importante (Alcance Parte II):** Todo el ecosistema se ejecuta de manera **100% local** integrando el **Frontend (React + TypeScript + Vite)**, el **Backend (Python + FastAPI + SQLModel)** y la **Base de Datos Relacional (SQL Server `EcoRAEE_DB`)**, dejando preparada la capa de servicios (`services/s3_service.py` y variables `.env`) para su futura migración a AWS (**RDS SQL Server, S3 y EC2**).

---

## Estructura del Proyecto (Basada en el Estándar de Referencia)

```text
Proyecto_Integrador_II/
├── Scripts/                       # Scripts oficiales de SQL Server (EcoRAEE_DB)
│   ├── 01_DDL.sql                 # Creación de BD, 23 tablas, PK, FK, UNIQUE, CHECK y DEFAULT
│   ├── 02_DML.sql                 # Carga de datos sintéticos (organizaciones, roles, 30 equipos, red, etc.)
│   ├── 03_pruebas.sql             # Pruebas de integridad referencial y restricciones CHECK/UNIQUE
│   └── 04_consultas.sql           # Consultas analíticas, subconsultas y KPIs de trazabilidad
├── backend/                       # API REST con Python y FastAPI
│   ├── app/routers/               # Endpoints modulares por dominio
│   │   ├── router_users.py        # Autenticación por rol (RBAC), Usuarios, Roles y Organizaciones
│   │   ├── router_catalogs.py     # Centros, Tipos de Centro, Categorías, Condiciones e Inventario
│   │   ├── router_solicitudes.py  # Solicitudes de recolección y Lotes
│   │   ├── router_dispositivos.py # CRUD Dispositivos, Evaluaciones, Transferencias, Tratamientos y Evidencias
│   │   └── router_network.py      # Algoritmo Edmonds-Karp (Flujo Máximo / Corte Mínimo), Alertas y Dashboard SQL
│   ├── models/                    # Modelos relacionales SQLModel mapeados a las 23 tablas de EcoRAEE_DB
│   ├── services/                  # Lógica de negocio transversal
│   │   ├── s3_service.py          # Almacenamiento local en /uploads (preparado para AWS S3 con boto3)
│   │   ├── flow_service.py        # Algoritmo de Edmonds-Karp y reglas de Matemática Discreta (RF-MD-01..05)
│   │   └── audit_service.py       # Registro automático en la tabla AUDITORIA
│   ├── uploads/                   # Repositorio local de evidencias (PDF, JPG, PNG, DOCX)
│   ├── MyDbContext.py             # Configuración del motor SQLAlchemy / SQLModel con pyodbc
│   ├── main.py                    # Punto de entrada FastAPI y configuración CORS
│   └── requirements.txt           # Dependencias del backend
└── frontend/                      # Aplicación Web SPA con React 19 + TypeScript + Tailwind CSS
    └── src/
        ├── api/client.ts          # Cliente HTTP Axios conectado a http://localhost:8000
        ├── components/            # Diseño atómico (atoms, molecules, organisms)
        ├── context/AuthContext.tsx# Estado global de sesión y cambio rápido de rol
        ├── pages/                 # Vistas del sistema
        │   ├── DashboardPage.tsx        # KPIs, Consultas de 04_consultas.sql, Alertas y Auditoría
        │   ├── DispositivosPage.tsx     # Ciclo completo RAEE: Registro -> Evaluación -> Transferencia -> Cierre
        │   ├── SolicitudesLotesPage.tsx # Solicitudes, Lotes, Centros e Inventario atómico
        │   ├── RedFlujoPage.tsx         # Simulador Edmonds-Karp (Flujo Máximo / Corte Mínimo) y Lógica Discreta
        │   ├── UsuariosOrgPage.tsx      # Gestión de Usuarios, Organizaciones (RUC 13 dígitos) y Roles
        │   └── AuthPage.tsx             # Login y selector rápido de los 5 integrantes / roles
        └── types/index.ts         # Interfaces TypeScript del dominio
```

---

## Instrucciones de Ejecución Local

### 1. Base de Datos (SQL Server Local)
Los 4 scripts ubicados en `/Scripts` ya fueron ejecutados sobre la instancia local `localhost` creando la base de datos **`EcoRAEE_DB`**. Si deseas recrearla desde cero:
```powershell
sqlcmd -S localhost -E -i .\Scripts\01_DDL.sql -f 65001
sqlcmd -S localhost -E -i .\Scripts\02_DML.sql -f 65001
sqlcmd -S localhost -E -i .\Scripts\03_pruebas.sql -f 65001
sqlcmd -S localhost -E -i .\Scripts\04_consultas.sql -f 65001
```

### 2. Ejecutar el Backend (FastAPI)
```powershell
cd backend
.\.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
- Documentación interactiva Swagger UI: `http://localhost:8000/docs`

### 3. Ejecutar el Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```
- Interfaz gráfica web: `http://localhost:5173`


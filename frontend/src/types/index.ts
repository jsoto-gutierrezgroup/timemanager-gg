// ─── Enums ────────────────────────────────────────────────────────────────────

export type EstadoUsuario = 'Activo' | 'Inactivo';
export type EstadoCliente = 'Activo' | 'Inactivo';
export type EstadoAsunto = 'Activo' | 'Inactivo' | 'Cerrado';
export type EstadoTiempo = 'Activo' | 'Aprobado' | 'Facturado' | 'FacturadoPagado';
export type TipoFacturacion =
  | 'PorHoras'
  | 'PorHorasConMontoEditable'
  | 'PorHitosOEtapas'
  | 'MontoFijoMensual';
export type Moneda = 'COP' | 'USD' | 'EUR';
export type Importancia = 'Baja' | 'Media' | 'Alta';
export type TipoAusencia = 'Vacaciones' | 'Permiso' | 'Incapacidad' | 'Otro';
export type TipoDocumento = 'CC' | 'NIT' | 'Pasaporte' | 'RUT' | 'CE' | 'Otro';

// ─── Config entities ──────────────────────────────────────────────────────────

export interface Role {
  id: number;
  nombre: string;
  permisos: Record<string, unknown>;
}

export interface UserCategory {
  id: number;
  nombre: string;
}

export interface PracticeArea {
  id: number;
  nombre: string;
}

export interface Absence {
  id: number;
  usuario_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoAusencia;
  descripcion: string | null;
  usuario?: Pick<User, 'id' | 'nombre' | 'email'>;
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: number;
  nombre: string;
  email: string;
  categoria_id: number | null;
  rol_id: number | null;
  area_practica_id: number | null;
  tarifa_horaria: string | null;
  estado: EstadoUsuario;
  created_at: string;
  updated_at: string;
  categoria?: UserCategory | null;
  rol?: Role | null;
  area_practica?: PracticeArea | null;
}

export interface Client {
  id: number;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
  tipo_documento: TipoDocumento | null;
  numero_documento: string | null;
  pais: string | null;
  ciudad: string | null;
  sector: string | null;
  tipo: string | null;
  responsable_id: number | null;
  emisor_facturacion_id: number | null;
  grupo_empresarial_id: number | null;
  estado: EstadoCliente;
  created_at: string;
  updated_at: string;
}

export interface Matter {
  id: number;
  codigo: string;
  cliente_id: number;
  nombre: string;
  area_practica_id: number | null;
  tipo_facturacion: TipoFacturacion;
  moneda: Moneda;
  monto_fijo: string | null;
  grupo_facturacion_id: number | null;
  estado: EstadoAsunto;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  usuario_id: number;
  cliente_id: number;
  asunto_id: number;
  actividad: string;
  fecha: string;
  duracion_horas: number;
  facturable: boolean;
  compartido_con: number | null;
  estado: EstadoTiempo;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  titulo: string;
  usuario_id: number;
  cliente_id: number;
  asunto_id: number;
  detalles: string;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  importancia: Importancia | null;
  estimado_minutos: number;
  finalizada: boolean;
  archivada: boolean;
  created_at: string;
  updated_at: string;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  nombre: string;
  email: string;
  rol_id: number | null;
  categoria?: UserCategory | null;
  rol?: Role | null;
  area_practica?: PracticeArea | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

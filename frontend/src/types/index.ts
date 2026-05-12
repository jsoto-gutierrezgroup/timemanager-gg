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

// ─── Phase 2 entities ─────────────────────────────────────────────────────────

export interface Cliente {
  id: number;
  codigo: string;
  razon_social: string;
  nombre_comercial?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  sector?: string | null;
  tipo?: string | null;
  responsable_id?: number | null;
  responsable?: { id: number; nombre: string } | null;
  emisor_facturacion_id?: number | null;
  emisor_facturacion?: { id: number; nombre: string } | null;
  grupo_empresarial_id?: number | null;
  grupo_empresarial?: { id: number; nombre: string } | null;
  estado: 'Activo' | 'Inactivo';
  created_at: string;
  updated_at: string;
}

export interface Asunto {
  id: number;
  codigo: string;
  cliente_id: number;
  cliente?: { id: number; codigo: string; razon_social: string } | null;
  nombre: string;
  area_practica_id?: number | null;
  area_practica?: { id: number; nombre: string } | null;
  tipo_facturacion: 'PorHoras' | 'PorHorasConMontoEditable' | 'PorHitosOEtapas' | 'MontoFijoMensual';
  moneda: 'COP' | 'USD' | 'EUR';
  monto_fijo?: string | null;
  grupo_facturacion_id?: number | null;
  estado: 'Activo' | 'Inactivo' | 'Cerrado';
  created_at: string;
  updated_at: string;
}

export interface Tiempo {
  id: number;
  usuario_id: number;
  usuario?: { id: number; nombre: string } | null;
  cliente_id: number;
  cliente?: { id: number; razon_social: string } | null;
  asunto_id: number;
  asunto?: { id: number; codigo: string; nombre: string } | null;
  actividad: string;
  fecha: string;
  duracion_horas: number; // stored in minutes
  facturable: boolean;
  compartido_con?: number | null;
  compartido_usuario?: { id: number; nombre: string } | null;
  estado: 'Activo' | 'Aprobado' | 'Facturado' | 'FacturadoPagado';
  created_at: string;
  updated_at: string;
}

export interface Tarea {
  id: number;
  titulo: string;
  usuario_id: number;
  usuario?: { id: number; nombre: string } | null;
  cliente_id: number;
  cliente?: { id: number; razon_social: string } | null;
  asunto_id: number;
  asunto?: { id: number; codigo: string; nombre: string } | null;
  detalles: string;
  fecha_inicio?: string | null;
  fecha_vencimiento?: string | null;
  importancia?: 'Baja' | 'Media' | 'Alta' | null;
  estimado_minutos: number;
  finalizada: boolean;
  archivada: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Phase 3 entities ─────────────────────────────────────────────────────────

export interface WipCliente extends Cliente {
  _count?: { asuntos: number };
}

export interface WipAsunto extends Asunto {
  horas_facturables: number;
  valor_tiempos: number;
  total_facturable: number;
  count_tiempos: number;
}

export interface DocumentoFacturacion {
  id: number;
  tipo_documento: 'Factura' | 'NotaDebito' | 'NotaCredito' | 'Recibo' | 'Otro';
  receptor_id: number;
  receptor?: { id: number; razon_social: string };
  emisor_id?: number | null;
  emisor?: { id: number; nombre: string } | null;
  asunto_id?: number | null;
  asunto?: { id: number; codigo: string; nombre: string } | null;
  rango_fecha_inicio: string;
  rango_fecha_fin: string;
  valor: number | string;
  moneda: 'COP' | 'USD' | 'EUR';
  impuesto_id?: number | null;
  impuesto?: { id: number; nombre: string; porcentaje: number } | null;
  gravamen_id?: number | null;
  gravamen?: { id: number; nombre: string; valor: number } | null;
  tasa_cambio_id?: number | null;
  tasa_cambio?: { id: number; moneda_origen: string; moneda_destino: string; tasa: number; fecha_vigencia: string } | null;
  estado: 'Borrador' | 'Emitido' | 'Pagado' | 'Anulado';
  created_at: string;
}

export interface Pago {
  id: number;
  cliente_id: number;
  cliente?: { id: number; razon_social: string };
  documento_id?: number | null;
  documento?: { id: number; tipo_documento: string } | null;
  monto: number | string;
  moneda: 'COP' | 'USD' | 'EUR';
  fecha_pago: string;
  estado: 'Pendiente' | 'Aplicado';
  created_at: string;
}

export interface Job {
  id: number;
  nombre: string;
  responsable_id?: number | null;
  responsable?: { id: number; nombre: string } | null;
  cliente_id?: number | null;
  cliente?: { id: number; razon_social: string } | null;
  tipo?: string | null;
  estado: 'Activo' | 'Cerrado' | 'Pausado';
  created_at: string;
}

export interface Impuesto {
  id: number;
  nombre: string;
  porcentaje: number | string;
}

export interface Gravamen {
  id: number;
  nombre: string;
  valor: number | string;
}

export interface TasaCambio {
  id: number;
  moneda_origen: string;
  moneda_destino: string;
  tasa: number | string;
  fecha_vigencia: string;
}

export interface DashboardStats {
  tareasActivas: number;
  tareasFinalizadas: number;
  totalTareas: number;
  horasEjecutadas: number;
  horasEstimadas: number;
  capacidadMinutos: number;
  topClientes: { nombre: string; minutos: number }[];
  horasPorDia: { fecha: string; facturables: number; noFacturables: number }[];
}

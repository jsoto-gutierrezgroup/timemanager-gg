import { api } from './api';
import { Asunto, Tiempo, DocumentoFacturacion, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface BillableAsunto extends Asunto {
  cliente?: {
    id: number;
    codigo: string;
    razon_social: string;
    responsable?: { id: number; nombre: string; tarifa_horaria?: string | null } | null;
  } | null;
  responsable?: { id: number; nombre: string } | null;
  count_tiempos: number;
  horas_facturables: number;
  valor: number;
  fecha_ultima: string | null;
}

export interface BillableObjectsFilters {
  usuario_id?: number;
  cliente_id?: number;
  asunto_id?: number;
  area_practica_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  tipo_facturacion?: string;
  page?: number;
  limit?: number;
}

export interface FacturarData {
  asunto_ids: number[];
  tipo_documento: string;
  rango_fecha_inicio: string;
  rango_fecha_fin: string;
  moneda: string;
  impuesto_id?: number | null;
  gravamen_id?: number | null;
  tasa_cambio_id?: number | null;
}

export const billableObjectsService = {
  async getList(filters: BillableObjectsFilters = {}): Promise<PaginatedResponse<BillableAsunto>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.usuario_id != null) params.usuario_id = filters.usuario_id;
      if (filters.cliente_id != null) params.cliente_id = filters.cliente_id;
      if (filters.asunto_id != null) params.asunto_id = filters.asunto_id;
      if (filters.area_practica_id != null) params.area_practica_id = filters.area_practica_id;
      if (filters.fecha_inicio) params.fecha_inicio = filters.fecha_inicio;
      if (filters.fecha_fin) params.fecha_fin = filters.fecha_fin;
      if (filters.tipo_facturacion) params.tipo_facturacion = filters.tipo_facturacion;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<BillableAsunto>>('/billable-objects', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getAsuntoTiempos(asuntoId: number): Promise<{ data: Tiempo[] }> {
    try {
      const { data } = await api.get<{ data: Tiempo[] }>(`/billable-objects/${asuntoId}/tiempos`);
      return data;
    } catch (err) { extractError(err); }
  },

  async facturar(payload: FacturarData): Promise<{ data: DocumentoFacturacion[]; created: number }> {
    try {
      const { data } = await api.post<{ data: DocumentoFacturacion[]; created: number }>('/billable-objects/facturar', payload);
      return data;
    } catch (err) { extractError(err); }
  },
};

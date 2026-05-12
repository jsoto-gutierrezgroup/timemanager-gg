import { api } from './api';
import { Asunto, Tiempo, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface ApprovalAsunto extends Asunto {
  cliente?: { id: number; codigo: string; razon_social: string } | null;
  area_practica?: { id: number; nombre: string } | null;
  count_activos: number;
  count_aprobados: number;
  count_tiempos: number;
  horas_facturables: number;
  horas_no_facturables: number;
}

export interface ApprovalFilters {
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

export const approvalService = {
  async getApprovalList(filters: ApprovalFilters = {}): Promise<PaginatedResponse<ApprovalAsunto>> {
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
      const { data } = await api.get<PaginatedResponse<ApprovalAsunto>>('/approval', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getAsuntoTiempos(asuntoId: number): Promise<{ data: Tiempo[] }> {
    try {
      const { data } = await api.get<{ data: Tiempo[] }>(`/approval/${asuntoId}/tiempos`);
      return data;
    } catch (err) { extractError(err); }
  },

  async bulkUpdateEstado(tiempo_ids: number[], estado: 'Aprobado' | 'Activo'): Promise<{ updated: number; estado: string }> {
    try {
      const { data } = await api.put<{ updated: number; estado: string }>('/approval/tiempos/bulk', { tiempo_ids, estado });
      return data;
    } catch (err) { extractError(err); }
  },
};

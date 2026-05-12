import { api } from './api';
import { Tiempo, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface TiempoFilters {
  usuario_id?: number;
  cliente_id?: number;
  asunto_id?: number;
  estado?: 'Activo' | 'Aprobado' | 'Facturado' | 'FacturadoPagado';
  facturable?: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  mostrar_todos?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateTiempoData {
  usuario_id: number;
  cliente_id: number;
  asunto_id: number;
  actividad: string;
  fecha: string;
  duracion: string; // HH:MM format
  facturable?: boolean;
  compartido_con?: number | null;
  estado?: 'Activo' | 'Aprobado' | 'Facturado' | 'FacturadoPagado';
}

export const tiempoService = {
  async getTiempos(filters: TiempoFilters = {}): Promise<PaginatedResponse<Tiempo>> {
    try {
      const params: Record<string, string | number | boolean> = {};
      if (filters.usuario_id != null) params.usuario_id = filters.usuario_id;
      if (filters.cliente_id != null) params.cliente_id = filters.cliente_id;
      if (filters.asunto_id != null) params.asunto_id = filters.asunto_id;
      if (filters.estado) params.estado = filters.estado;
      if (filters.facturable !== undefined) params.facturable = filters.facturable;
      if (filters.fecha_inicio) params.fecha_inicio = filters.fecha_inicio;
      if (filters.fecha_fin) params.fecha_fin = filters.fecha_fin;
      if (filters.mostrar_todos !== undefined) params.mostrar_todos = filters.mostrar_todos;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Tiempo>>('/tiempos', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getTiempo(id: number): Promise<Tiempo> {
    try {
      const { data } = await api.get<Tiempo>(`/tiempos/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createTiempo(payload: CreateTiempoData): Promise<Tiempo> {
    try {
      const { data } = await api.post<Tiempo>('/tiempos', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateTiempo(id: number, payload: Partial<CreateTiempoData>): Promise<Tiempo> {
    try {
      const { data } = await api.put<Tiempo>(`/tiempos/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteTiempo(id: number): Promise<void> {
    try {
      await api.delete(`/tiempos/${id}`);
    } catch (err) { extractError(err); }
  },
};

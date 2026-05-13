import { api } from './api';
import { Moneda, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface Tarifa {
  id: number;
  usuario_id?: number | null;
  usuario?: { id: number; nombre: string } | null;
  categoria_id?: number | null;
  categoria?: { id: number; nombre: string } | null;
  cliente_id?: number | null;
  cliente?: { id: number; razon_social: string } | null;
  valor: string | number;
  moneda: Moneda;
}

export interface TarifaFilters {
  usuario_id?: number;
  categoria_id?: number;
  cliente_id?: number;
  moneda?: Moneda;
  page?: number;
  limit?: number;
}

export interface CreateTarifaData {
  usuario_id?: number | null;
  categoria_id?: number | null;
  cliente_id?: number | null;
  valor: number | string;
  moneda: Moneda;
}

export const tarifasService = {
  async getTarifas(filters: TarifaFilters = {}): Promise<PaginatedResponse<Tarifa>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.usuario_id) params.usuario_id = filters.usuario_id;
      if (filters.categoria_id) params.categoria_id = filters.categoria_id;
      if (filters.cliente_id) params.cliente_id = filters.cliente_id;
      if (filters.moneda) params.moneda = filters.moneda;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Tarifa>>('/tarifas', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getTarifa(id: number): Promise<Tarifa> {
    try {
      const { data } = await api.get<Tarifa>(`/tarifas/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createTarifa(payload: CreateTarifaData): Promise<Tarifa> {
    try {
      const { data } = await api.post<Tarifa>('/tarifas', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateTarifa(id: number, payload: Partial<CreateTarifaData>): Promise<Tarifa> {
    try {
      const { data } = await api.put<Tarifa>(`/tarifas/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteTarifa(id: number): Promise<void> {
    try {
      await api.delete(`/tarifas/${id}`);
    } catch (err) { extractError(err); }
  },
};

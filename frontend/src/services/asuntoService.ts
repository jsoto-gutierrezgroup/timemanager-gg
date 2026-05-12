import { api } from './api';
import { Asunto, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface AsuntoFilters {
  cliente_id?: number;
  estado?: 'Activo' | 'Inactivo' | 'Cerrado';
  page?: number;
  limit?: number;
}

export interface CreateAsuntoData {
  cliente_id: number;
  nombre: string;
  area_practica_id?: number | null;
  tipo_facturacion: 'PorHoras' | 'PorHorasConMontoEditable' | 'PorHitosOEtapas' | 'MontoFijoMensual';
  moneda?: 'COP' | 'USD' | 'EUR';
  monto_fijo?: number | null;
  grupo_facturacion_id?: number | null;
  estado?: 'Activo' | 'Inactivo' | 'Cerrado';
}

export const asuntoService = {
  async getAsuntos(filters: AsuntoFilters = {}): Promise<PaginatedResponse<Asunto>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.cliente_id != null) params.cliente_id = filters.cliente_id;
      if (filters.estado) params.estado = filters.estado;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Asunto>>('/asuntos', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getAsunto(id: number): Promise<Asunto> {
    try {
      const { data } = await api.get<Asunto>(`/asuntos/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createAsunto(payload: CreateAsuntoData): Promise<Asunto> {
    try {
      const { data } = await api.post<Asunto>('/asuntos', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateAsunto(id: number, payload: Partial<CreateAsuntoData>): Promise<Asunto> {
    try {
      const { data } = await api.put<Asunto>(`/asuntos/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },
};

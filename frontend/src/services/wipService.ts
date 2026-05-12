import { api } from './api';
import { WipCliente, WipAsunto, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface WipClienteFilters {
  search?: string;
  estado?: 'Activo' | 'Inactivo';
  responsable_id?: number;
  emisor_facturacion_id?: number;
  grupo_empresarial_id?: number;
  page?: number;
  limit?: number;
}

export interface WipAsuntoFilters {
  usuario_id?: number;
  area_practica_id?: number;
  tipo_facturacion?: string;
  estado_asunto?: string;
  estado_tiempos?: string;
  facturable?: boolean;
}

export const wipService = {
  async getClientes(filters: WipClienteFilters = {}): Promise<PaginatedResponse<WipCliente>> {
    try {
      const params: Record<string, string | number | boolean> = {};
      if (filters.search) params.search = filters.search;
      if (filters.estado) params.estado = filters.estado;
      if (filters.responsable_id != null) params.responsable_id = filters.responsable_id;
      if (filters.emisor_facturacion_id != null) params.emisor_facturacion_id = filters.emisor_facturacion_id;
      if (filters.grupo_empresarial_id != null) params.grupo_empresarial_id = filters.grupo_empresarial_id;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<WipCliente>>('/wip', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getAsuntos(clienteId: number, filters: WipAsuntoFilters = {}): Promise<{ data: WipAsunto[] }> {
    try {
      const params: Record<string, string | number | boolean> = {};
      if (filters.usuario_id != null) params.usuario_id = filters.usuario_id;
      if (filters.area_practica_id != null) params.area_practica_id = filters.area_practica_id;
      if (filters.tipo_facturacion) params.tipo_facturacion = filters.tipo_facturacion;
      if (filters.estado_asunto) params.estado_asunto = filters.estado_asunto;
      if (filters.estado_tiempos) params.estado_tiempos = filters.estado_tiempos;
      if (filters.facturable !== undefined) params.facturable = filters.facturable;
      const { data } = await api.get<{ data: WipAsunto[] }>(`/wip/${clienteId}/asuntos`, { params });
      return data;
    } catch (err) { extractError(err); }
  },
};

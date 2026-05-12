import { api } from './api';
import { Cliente, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface ClienteFilters {
  search?: string;
  estado?: 'Activo' | 'Inactivo';
  page?: number;
  limit?: number;
}

export interface CreateClienteData {
  razon_social: string;
  nombre_comercial?: string | null;
  tipo_documento?: string | null;
  numero_documento?: string | null;
  pais?: string | null;
  ciudad?: string | null;
  sector?: string | null;
  tipo?: string | null;
  responsable_id?: number | null;
  emisor_facturacion_id?: number | null;
  grupo_empresarial_id?: number | null;
  estado?: 'Activo' | 'Inactivo';
}

export const clienteService = {
  async getClientes(filters: ClienteFilters = {}): Promise<PaginatedResponse<Cliente>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.search) params.search = filters.search;
      if (filters.estado) params.estado = filters.estado;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Cliente>>('/clientes', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getCliente(id: number): Promise<Cliente> {
    try {
      const { data } = await api.get<Cliente>(`/clientes/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createCliente(payload: CreateClienteData): Promise<Cliente> {
    try {
      const { data } = await api.post<Cliente>('/clientes', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateCliente(id: number, payload: Partial<CreateClienteData>): Promise<Cliente> {
    try {
      const { data } = await api.put<Cliente>(`/clientes/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteCliente(id: number): Promise<void> {
    try {
      await api.delete(`/clientes/${id}`);
    } catch (err) { extractError(err); }
  },
};

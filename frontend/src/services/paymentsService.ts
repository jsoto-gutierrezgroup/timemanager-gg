import { api } from './api';
import { Pago, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface PaymentFilters {
  cliente_id?: number;
  documento_id?: number;
  estado?: 'Pendiente' | 'Aplicado';
  fecha_inicio?: string;
  fecha_fin?: string;
  page?: number;
  limit?: number;
}

export interface CreatePagoData {
  cliente_id: number;
  documento_id?: number | null;
  monto: number;
  moneda: 'COP' | 'USD' | 'EUR';
  fecha_pago: string;
  estado?: 'Pendiente' | 'Aplicado';
}

export const paymentsService = {
  async getPayments(filters: PaymentFilters = {}): Promise<PaginatedResponse<Pago>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.cliente_id != null) params.cliente_id = filters.cliente_id;
      if (filters.documento_id != null) params.documento_id = filters.documento_id;
      if (filters.estado) params.estado = filters.estado;
      if (filters.fecha_inicio) params.fecha_inicio = filters.fecha_inicio;
      if (filters.fecha_fin) params.fecha_fin = filters.fecha_fin;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Pago>>('/payments', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getPayment(id: number): Promise<Pago> {
    try {
      const { data } = await api.get<Pago>(`/payments/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createPayment(payload: CreatePagoData): Promise<Pago> {
    try {
      const { data } = await api.post<Pago>('/payments', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updatePayment(id: number, payload: Partial<CreatePagoData>): Promise<Pago> {
    try {
      const { data } = await api.put<Pago>(`/payments/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deletePayment(id: number): Promise<void> {
    try {
      await api.delete(`/payments/${id}`);
    } catch (err) { extractError(err); }
  },
};

import { api } from './api';
import { DocumentoFacturacion, Impuesto, Gravamen, TasaCambio, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface DocumentoFilters {
  receptor_id?: number;
  emisor_id?: number;
  asunto_id?: number;
  tipo_documento?: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  page?: number;
  limit?: number;
}

export interface CreateDocumentoData {
  tipo_documento: string;
  receptor_id: number;
  emisor_id?: number | null;
  asunto_id?: number | null;
  rango_fecha_inicio: string;
  rango_fecha_fin: string;
  valor: number;
  moneda: string;
  impuesto_id?: number | null;
  gravamen_id?: number | null;
  tasa_cambio_id?: number | null;
  estado?: string;
}

export const billingService = {
  // Documents
  async getDocuments(filters: DocumentoFilters = {}): Promise<PaginatedResponse<DocumentoFacturacion>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.receptor_id != null) params.receptor_id = filters.receptor_id;
      if (filters.emisor_id != null) params.emisor_id = filters.emisor_id;
      if (filters.asunto_id != null) params.asunto_id = filters.asunto_id;
      if (filters.tipo_documento) params.tipo_documento = filters.tipo_documento;
      if (filters.estado) params.estado = filters.estado;
      if (filters.fecha_inicio) params.fecha_inicio = filters.fecha_inicio;
      if (filters.fecha_fin) params.fecha_fin = filters.fecha_fin;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<DocumentoFacturacion>>('/billing/documents', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getDocument(id: number): Promise<DocumentoFacturacion> {
    try {
      const { data } = await api.get<DocumentoFacturacion>(`/billing/documents/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createDocument(payload: CreateDocumentoData): Promise<DocumentoFacturacion> {
    try {
      const { data } = await api.post<DocumentoFacturacion>('/billing/documents', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateDocument(id: number, payload: Partial<CreateDocumentoData>): Promise<DocumentoFacturacion> {
    try {
      const { data } = await api.put<DocumentoFacturacion>(`/billing/documents/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  // Impuestos
  async getImpuestos(): Promise<{ data: Impuesto[] }> {
    try {
      const { data } = await api.get<{ data: Impuesto[] }>('/billing/impuestos');
      return data;
    } catch (err) { extractError(err); }
  },

  async createImpuesto(payload: { nombre: string; porcentaje: number }): Promise<Impuesto> {
    try {
      const { data } = await api.post<Impuesto>('/billing/impuestos', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateImpuesto(id: number, payload: Partial<{ nombre: string; porcentaje: number }>): Promise<Impuesto> {
    try {
      const { data } = await api.put<Impuesto>(`/billing/impuestos/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteImpuesto(id: number): Promise<void> {
    try {
      await api.delete(`/billing/impuestos/${id}`);
    } catch (err) { extractError(err); }
  },

  // Gravámenes
  async getGravamenes(): Promise<{ data: Gravamen[] }> {
    try {
      const { data } = await api.get<{ data: Gravamen[] }>('/billing/gravamenes');
      return data;
    } catch (err) { extractError(err); }
  },

  async createGravamen(payload: { nombre: string; valor: number }): Promise<Gravamen> {
    try {
      const { data } = await api.post<Gravamen>('/billing/gravamenes', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateGravamen(id: number, payload: Partial<{ nombre: string; valor: number }>): Promise<Gravamen> {
    try {
      const { data } = await api.put<Gravamen>(`/billing/gravamenes/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteGravamen(id: number): Promise<void> {
    try {
      await api.delete(`/billing/gravamenes/${id}`);
    } catch (err) { extractError(err); }
  },

  // Tasas de cambio
  async getTasasCambio(): Promise<{ data: TasaCambio[] }> {
    try {
      const { data } = await api.get<{ data: TasaCambio[] }>('/billing/tasas-cambio');
      return data;
    } catch (err) { extractError(err); }
  },

  async createTasaCambio(payload: { moneda_origen: string; moneda_destino: string; tasa: number; fecha_vigencia: string }): Promise<TasaCambio> {
    try {
      const { data } = await api.post<TasaCambio>('/billing/tasas-cambio', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateTasaCambio(id: number, payload: Partial<{ moneda_origen: string; moneda_destino: string; tasa: number; fecha_vigencia: string }>): Promise<TasaCambio> {
    try {
      const { data } = await api.put<TasaCambio>(`/billing/tasas-cambio/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteTasaCambio(id: number): Promise<void> {
    try {
      await api.delete(`/billing/tasas-cambio/${id}`);
    } catch (err) { extractError(err); }
  },
};

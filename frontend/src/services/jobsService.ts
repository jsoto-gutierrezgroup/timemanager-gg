import { api } from './api';
import { Job, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface JobFilters {
  responsable_id?: number;
  cliente_id?: number;
  tipo?: string;
  estado?: 'Activo' | 'Cerrado' | 'Pausado';
  page?: number;
  limit?: number;
}

export interface CreateJobData {
  nombre: string;
  responsable_id?: number | null;
  cliente_id?: number | null;
  tipo?: string | null;
  estado?: 'Activo' | 'Cerrado' | 'Pausado';
}

export const jobsService = {
  async getJobs(filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.responsable_id != null) params.responsable_id = filters.responsable_id;
      if (filters.cliente_id != null) params.cliente_id = filters.cliente_id;
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.estado) params.estado = filters.estado;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Job>>('/jobs', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getJob(id: number): Promise<Job> {
    try {
      const { data } = await api.get<Job>(`/jobs/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createJob(payload: CreateJobData): Promise<Job> {
    try {
      const { data } = await api.post<Job>('/jobs', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateJob(id: number, payload: Partial<CreateJobData>): Promise<Job> {
    try {
      const { data } = await api.put<Job>(`/jobs/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteJob(id: number): Promise<void> {
    try {
      await api.delete(`/jobs/${id}`);
    } catch (err) { extractError(err); }
  },
};

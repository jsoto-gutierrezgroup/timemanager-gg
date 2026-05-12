import { api } from './api';
import { Tarea, PaginatedResponse } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export interface TareaFilters {
  usuario_id?: number;
  cliente_id?: number;
  asunto_id?: number;
  finalizada?: boolean;
  archivada?: boolean;
  importancia?: 'Baja' | 'Media' | 'Alta';
  mostrar_todos?: boolean;
  sort?: 'vencimiento' | 'importancia';
  page?: number;
  limit?: number;
}

export interface CreateTareaData {
  titulo: string;
  usuario_id: number;
  cliente_id: number;
  asunto_id: number;
  detalles: string;
  fecha_inicio?: string | null;
  fecha_vencimiento?: string | null;
  importancia?: 'Baja' | 'Media' | 'Alta' | null;
  estimado_minutos?: number;
  finalizada?: boolean;
  archivada?: boolean;
}

export const tareaService = {
  async getTareas(filters: TareaFilters = {}): Promise<PaginatedResponse<Tarea>> {
    try {
      const params: Record<string, string | number | boolean> = {};
      if (filters.usuario_id != null) params.usuario_id = filters.usuario_id;
      if (filters.cliente_id != null) params.cliente_id = filters.cliente_id;
      if (filters.asunto_id != null) params.asunto_id = filters.asunto_id;
      if (filters.finalizada !== undefined) params.finalizada = filters.finalizada;
      if (filters.archivada !== undefined) params.archivada = filters.archivada;
      if (filters.importancia) params.importancia = filters.importancia;
      if (filters.mostrar_todos !== undefined) params.mostrar_todos = filters.mostrar_todos;
      if (filters.sort) params.sort = filters.sort;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Tarea>>('/tareas', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async getTarea(id: number): Promise<Tarea> {
    try {
      const { data } = await api.get<Tarea>(`/tareas/${id}`);
      return data;
    } catch (err) { extractError(err); }
  },

  async createTarea(payload: CreateTareaData): Promise<Tarea> {
    try {
      const { data } = await api.post<Tarea>('/tareas', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async updateTarea(id: number, payload: Partial<CreateTareaData>): Promise<Tarea> {
    try {
      const { data } = await api.put<Tarea>(`/tareas/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async deleteTarea(id: number): Promise<void> {
    try {
      await api.delete(`/tareas/${id}`);
    } catch (err) { extractError(err); }
  },
};

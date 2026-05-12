import { api } from './api';
import { Role, UserCategory, PracticeArea, Absence, PaginatedResponse, TipoAusencia } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export const rolesService = {
  async getAll(): Promise<Role[]> {
    try {
      const { data } = await api.get<Role[]>('/settings/roles');
      return data;
    } catch (err) { extractError(err); }
  },

  async create(payload: { nombre: string; permisos?: Record<string, unknown> }): Promise<Role> {
    try {
      const { data } = await api.post<Role>('/settings/roles', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async update(id: number, payload: { nombre?: string; permisos?: Record<string, unknown> }): Promise<Role> {
    try {
      const { data } = await api.put<Role>(`/settings/roles/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/settings/roles/${id}`);
    } catch (err) { extractError(err); }
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoriesService = {
  async getAll(): Promise<UserCategory[]> {
    try {
      const { data } = await api.get<UserCategory[]>('/settings/categories');
      return data;
    } catch (err) { extractError(err); }
  },

  async create(payload: { nombre: string }): Promise<UserCategory> {
    try {
      const { data } = await api.post<UserCategory>('/settings/categories', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async update(id: number, payload: { nombre: string }): Promise<UserCategory> {
    try {
      const { data } = await api.put<UserCategory>(`/settings/categories/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/settings/categories/${id}`);
    } catch (err) { extractError(err); }
  },
};

// ─── Areas ────────────────────────────────────────────────────────────────────

export const areasService = {
  async getAll(): Promise<PracticeArea[]> {
    try {
      const { data } = await api.get<PracticeArea[]>('/settings/areas');
      return data;
    } catch (err) { extractError(err); }
  },

  async create(payload: { nombre: string }): Promise<PracticeArea> {
    try {
      const { data } = await api.post<PracticeArea>('/settings/areas', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async update(id: number, payload: { nombre: string }): Promise<PracticeArea> {
    try {
      const { data } = await api.put<PracticeArea>(`/settings/areas/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/settings/areas/${id}`);
    } catch (err) { extractError(err); }
  },
};

// ─── Ausencias ────────────────────────────────────────────────────────────────

export interface AusenciaFilters {
  usuario_id?: number;
  page?: number;
  limit?: number;
}

export interface CreateAusenciaData {
  usuario_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: TipoAusencia;
  descripcion?: string | null;
}

export const ausenciasService = {
  async getAll(filters: AusenciaFilters = {}): Promise<PaginatedResponse<Absence>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.usuario_id != null) params.usuario_id = filters.usuario_id;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<Absence>>('/settings/ausencias', { params });
      return data;
    } catch (err) { extractError(err); }
  },

  async create(payload: CreateAusenciaData): Promise<Absence> {
    try {
      const { data } = await api.post<Absence>('/settings/ausencias', payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async update(id: number, payload: Partial<CreateAusenciaData>): Promise<Absence> {
    try {
      const { data } = await api.put<Absence>(`/settings/ausencias/${id}`, payload);
      return data;
    } catch (err) { extractError(err); }
  },

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`/settings/ausencias/${id}`);
    } catch (err) { extractError(err); }
  },
};

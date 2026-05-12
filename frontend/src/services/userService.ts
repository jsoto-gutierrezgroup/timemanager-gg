import { api } from './api';
import { User, PaginatedResponse } from '../types';

export interface UserFilters {
  categoria_id?: number;
  rol_id?: number;
  area_practica_id?: number;
  estado?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserData {
  nombre: string;
  email: string;
  password: string;
  categoria_id?: number | null;
  rol_id?: number | null;
  area_practica_id?: number | null;
  tarifa_horaria?: number | null;
  estado?: 'Activo' | 'Inactivo';
}

export interface UpdateUserData {
  nombre?: string;
  email?: string;
  password?: string;
  categoria_id?: number | null;
  rol_id?: number | null;
  area_practica_id?: number | null;
  tarifa_horaria?: number | null;
  estado?: 'Activo' | 'Inactivo';
}

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export const userService = {
  async getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.categoria_id != null) params.categoria_id = filters.categoria_id;
      if (filters.rol_id != null) params.rol_id = filters.rol_id;
      if (filters.area_practica_id != null) params.area_practica_id = filters.area_practica_id;
      if (filters.estado) params.estado = filters.estado;
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get<PaginatedResponse<User>>('/users', { params });
      return data;
    } catch (err) {
      extractError(err);
    }
  },

  async getUser(id: number): Promise<User> {
    try {
      const { data } = await api.get<User>(`/users/${id}`);
      return data;
    } catch (err) {
      extractError(err);
    }
  },

  async createUser(userData: CreateUserData): Promise<User> {
    try {
      const { data } = await api.post<User>('/users', userData);
      return data;
    } catch (err) {
      extractError(err);
    }
  },

  async updateUser(id: number, userData: UpdateUserData): Promise<User> {
    try {
      const { data } = await api.put<User>(`/users/${id}`, userData);
      return data;
    } catch (err) {
      extractError(err);
    }
  },

  async deleteUser(id: number): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (err) {
      extractError(err);
    }
  },
};

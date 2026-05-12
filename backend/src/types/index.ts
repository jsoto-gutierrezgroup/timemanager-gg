import { Request } from 'express';

export interface JwtPayload {
  id: number;
  email: string;
  nombre: string;
  rol_id: number | null;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface UserFilters extends PaginationQuery {
  categoria_id?: string;
  rol_id?: string;
  area_practica_id?: string;
  estado?: string;
  search?: string;
}

export interface AusenciaFilters extends PaginationQuery {
  usuario_id?: string;
}

import { api } from './api';
import { DashboardStats } from '../types';

function extractError(error: unknown): never {
  const msg =
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
    'Error en la operación';
  throw new Error(msg);
}

export type DashboardPeriodo = 'ultima_semana' | 'ultimo_mes' | 'ultimos_3_meses';

export const dashboardService = {
  async getStats(periodo: DashboardPeriodo = 'ultimo_mes'): Promise<DashboardStats> {
    try {
      const { data } = await api.get<DashboardStats>('/dashboard/stats', { params: { periodo } });
      return data;
    } catch (err) { extractError(err); }
  },
};

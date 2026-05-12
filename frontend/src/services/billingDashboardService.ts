import { api } from './api';

export interface BillingDashboardParams {
  primer_aprobador_id?: number;
  segundo_aprobador_id?: number;
  cliente_id?: number;
  asunto_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  periodo?: 'mes' | '3meses' | 'anio';
}

export interface AprobacionResumenItem {
  usuario_id: number;
  nombre: string;
  total_tiempos: number;
  horas_facturables: number;
  valor_total: number;
  estados: { Activo: number; Aprobado: number };
}

export interface PodioRankingItem {
  posicion: number;
  usuario_id: number;
  nombre: string;
  horas_facturadas: number;
  valor: number;
}

export interface BillingDashboardStats {
  aprobacion: {
    resumen: AprobacionResumenItem[];
    total_pendientes: number;
    total_aprobados: number;
    valor_pendiente: number;
  };
  podio: {
    rankings: PodioRankingItem[];
  };
}

export interface ApprovalTableItem {
  usuario_id: number;
  nombre: string;
  total_tiempos: number;
  horas_facturables: number;
  valor_total: number;
  count_aprobados: number;
}

export interface ApprovalTableResponse {
  data: ApprovalTableItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const billingDashboardService = {
  async getStats(params?: BillingDashboardParams): Promise<BillingDashboardStats> {
    const response = await api.get<BillingDashboardStats>('/billing-dashboard/stats', { params });
    return response.data;
  },

  async getApprovalTable(
    params?: BillingDashboardParams & { page?: number; limit?: number }
  ): Promise<ApprovalTableResponse> {
    const response = await api.get<ApprovalTableResponse>('/billing-dashboard/approval-table', { params });
    return response.data;
  },
};

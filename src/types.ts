/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  OPERATOR = 'OPERATOR',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN'
}

export enum CierreStatus {
  PENDIENTE = 'Pendiente',
  APROBADO = 'Aprobado',
  RECHAZADO = 'Rechazado'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
}

export interface Isla {
  id: string;
  name: string;
  pumpIds: string[];
}

export interface Lectura {
  pumpId: string;
  initialLiters: number;
  finalLiters: number;
  pricePerLiter: number;
}

export interface CierreCaja {
  id: string;
  fechaTurno: string;
  startTime: string;
  endTime?: string;
  userId: string;
  userName: string;
  islaId: string;
  islaName: string;
  turno: number;
  
  // Teoria
  lecturas: Lectura[];
  ventaTeorica: number;
  
  // Declaracion
  efectivoDeclarado: number;
  tarjetasDeclarado: number;
  valesDeclarado: number;
  
  // Calculado
  totalDeclarado: number;
  descuadre: number;
  
  status: CierreStatus;
  supervisorId?: string;
  notes?: string;
  
  // Stats for reporting
  stats?: {
    ventaTotal: number;
    recaudadoTotal: number;
    diferencia: number;
  };
  
  // Assets
  attachments: string[]; // Base64 or Object URLs
  workerPhoto?: string;
}

export interface Auditoria {
  id: string;
  cierreId: string;
  supervisorId: string;
  observaciones: string;
  ajusteAplicado: number;
  fechaAuditoria: string;
}

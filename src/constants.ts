/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, User, Isla } from './types.ts';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Juan Pérez', role: UserRole.OPERATOR, email: 'juan@ecoflow.com', password: '1111' },
  { id: 'u2', name: 'Maria Garcia', role: UserRole.OPERATOR, email: 'maria@ecoflow.com', password: '2222' },
  { id: 's1', name: 'Carlos Admin', role: UserRole.SUPERVISOR, email: 'carlos@ecoflow.com', password: '3333' },
  { id: 'a1', name: 'Super Admin', role: UserRole.ADMIN, email: 'admin@ecoflow.com', password: '4444' },
];

export const MOCK_ISLAS: Isla[] = [
  { id: 'i1', name: 'Isla 01 - Principal', pumpIds: ['P1', 'P2', 'P3'] },
  { id: 'i2', name: 'Isla 02 - Diesel', pumpIds: ['P4', 'P5'] },
  { id: 'i3', name: 'Isla 03 - Full', pumpIds: ['P6', 'P7', 'P8', 'P9'] },
];

export const FUEL_PRICE = 1.25; // Default price per liter

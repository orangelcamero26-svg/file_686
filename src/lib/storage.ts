/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CierreCaja, Auditoria, User } from '../types.ts';
import { supabase } from './supabase.ts';

export const StorageService = {
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data as User[];
  },

  saveUser: async (user: User) => {
    const { error } = await supabase.from('users').upsert(user);
    if (error) console.error('Error saving user:', error);
  },

  deleteUser: async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error('Error deleting user:', error);
  },

  deleteCierre: async (id: string) => {
    const { error } = await supabase.from('cierres').delete().eq('id', id);
    if (error) console.error('Error deleting cierre:', error);
  },

  getCierres: async (): Promise<CierreCaja[]> => {
    const { data, error } = await supabase.from('cierres').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching cierres:', error);
      return [];
    }
    return data as CierreCaja[];
  },

  saveCierre: async (cierre: CierreCaja) => {
    const { error } = await supabase.from('cierres').upsert(cierre);
    if (error) console.error('Error saving cierre:', error);
  },

  getAuditorias: async (): Promise<Auditoria[]> => {
    const { data, error } = await supabase.from('auditorias').select('*');
    if (error) {
      console.error('Error fetching auditorias:', error);
      return [];
    }
    return data as Auditoria[];
  },

  saveAuditoria: async (auditoria: Auditoria) => {
    const { error } = await supabase.from('auditorias').insert(auditoria);
    if (error) console.error('Error saving auditoria:', error);
  }
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Fuel, 
  ClipboardCheck, 
  Users, 
  Settings, 
  LogOut, 
  ChevronRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole, CierreCaja, CierreStatus, Isla } from './types.ts';
import { MOCK_USERS, MOCK_ISLAS } from './constants.ts';
import { StorageService } from './lib/storage.ts';

// View Components (Will be moved to separate files if they grow)
import OperatorDashboard from './components/OperatorDashboard.tsx';
import AuditorDashboard from './components/AuditorDashboard.tsx';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'turno' | 'islas' | 'depositos' | 'pagos' | 'cuadre'>('turno');

  const handleLogin = async () => {
    const users = await StorageService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user && user.password === password) {
      setCurrentUser(user);
      setPassword('');
      setEmail('');
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(238,28,37,0.15)] border-t-8 border-warning relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16" />
          
          <div className="flex flex-col items-center gap-4 mb-12 text-center relative z-10">
            <div className="bg-white p-4 rounded-[2rem] shadow-xl shadow-brand-500/20 border-4 border-warning w-28 h-28 flex items-center justify-center overflow-hidden">
              <img 
                src="/shell-logo.png" 
                alt="Logo Shell" 
                className="w-24 h-24 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Estación Digital</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">Control de Rendiciones Shell</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="label-micro">Correo Electrónico / Usuario</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">@</span>
                  <input 
                    type="email"
                    className="input-clean pl-10 h-14"
                    placeholder="usuario@ecoflow.com"
                    value={email}
                    onChange={(e) => {
                      setError(false);
                      setEmail(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="label-micro">Contraseña / PIN</label>
                <div className="relative">
                  <input 
                    type="password"
                    inputMode="numeric"
                    className="input-clean h-14"
                    placeholder="••••"
                    value={password}
                    onChange={(e) => {
                      setError(false);
                      setPassword(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest text-center py-3 rounded-xl"
              >
                Credenciales Incorrectas
              </motion.div>
            )}

            <button 
              onClick={handleLogin}
              className="w-full bg-brand-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
            >
              Entrar al Sistema
              <ArrowRight className="w-4 h-4" />
            </button>
            
            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Si olvidó su acceso contacte al supervisor
            </p>
          </div>
        </motion.div>
      </div>
    );
  }


  const isOperator = currentUser.role === UserRole.OPERATOR;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-20">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b-2 border-brand-500 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-brand-500/20 border border-slate-100 p-1 overflow-hidden">
            <img 
              src="/shell-logo.png" 
              alt="Logo Shell" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tight italic">Estación Digital</h1>
            <span className="text-[10px] text-brand-600 font-black uppercase tracking-widest italic">
              {isOperator ? 'Shell Atendedor' : 'Shell Auditoría'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentUser(null)}
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className={`w-full mx-auto px-4 ${isOperator ? 'max-w-md' : 'max-w-7xl'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentUser.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {isOperator ? (
              <OperatorDashboard user={currentUser} activeTab={activeTab} onTabChange={setActiveTab} />
            ) : (
              <AuditorDashboard user={currentUser} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTTOM NAV (Only for Operator as it matches the reference flow) */}
      {isOperator && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 flex justify-around items-center px-1 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.03)] py-1">
          {[
            { id: 'turno', label: 'Turno', icon: "👤" },
            { id: 'islas', label: 'Islas', icon: "⛽" },
            { id: 'depositos', label: 'Depósitos', icon: "🏦" },
            { id: 'pagos', label: 'Pagos', icon: "💳" },
            { id: 'cuadre', label: 'Cuadre', icon: "📊" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 relative transition-all duration-200 h-full ${
                activeTab === tab.id ? 'text-brand-600 font-black' : 'text-slate-400'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="active-tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-warning rounded-b-full shadow-lg shadow-warning/20 border-x border-brand-500" 
                />
              )}
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

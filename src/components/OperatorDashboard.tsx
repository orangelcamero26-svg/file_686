/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Fuel,
  ArrowRight, 
  Plus, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  MapPin,
  Camera,
  Image as ImageIcon,
  Trash2,
  MessageCircle,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, CierreCaja, CierreStatus } from '../types.ts';
import { StorageService } from '../lib/storage.ts';

interface Props {
  user: User;
  activeTab: 'turno' | 'islas' | 'depositos' | 'pagos' | 'cuadre';
  onTabChange: (tab: any) => void;
}

export default function OperatorDashboard({ user, activeTab, onTabChange }: Props) {
  const [shift, setShift] = useState('1');
  const [islas, setIslas] = useState<{ id: number, comb: number, noComb: number }[]>([{ id: 1, comb: 0, noComb: 0 }]);
  const [depositos, setDepositos] = useState<{ id: number, num: string, val: number }[]>([{ id: 1, num: '', val: 0 }, { id: 2, num: '', val: 0 }]);
  const [pagos, setPagos] = useState<{
    creditos: { desc: string, val: number }[],
    tarjetas: { desc: string, val: number }[],
    copiloto: { desc: string, val: number }[],
    shellcard: { desc: string, val: number }[]
  }>({
    creditos: [{ desc: '', val: 0 }],
    tarjetas: [{ desc: '', val: 0 }],
    copiloto: [{ desc: '', val: 0 }],
    shellcard: [{ desc: '', val: 0 }]
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workerPhoto, setWorkerPhoto] = useState<string | null>(user.photo || null);
  const [soporteImagen, setSoporteImagen] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Calculations
  const totalIslas = islas.reduce((acc, i) => acc + i.comb + i.noComb, 0);
  const totalDepositos = depositos.reduce((acc, d) => acc + d.val, 0);
  const totalCreditos = pagos.creditos.reduce((acc, p) => acc + p.val, 0);
  const totalTarjetas = pagos.tarjetas.reduce((acc, p) => acc + p.val, 0);
  const totalCopiloto = pagos.copiloto.reduce((acc, p) => acc + p.val, 0);
  const totalShellcard = pagos.shellcard.reduce((acc, p) => acc + p.val, 0);
  
  const totalRecaudado = totalDepositos + totalCreditos + totalTarjetas + totalCopiloto + totalShellcard;
  const diferencia = totalRecaudado - totalIslas;

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(Math.floor(val));
    const formatted = new Intl.NumberFormat('es-CL').format(absVal);
    return `${val < 0 ? '-' : ''}$${formatted}`;
  };

  const formatForInput = (val: number | string) => {
    if (val === 0 || val === '0') return '';
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, '')) : val;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('es-CL').format(num);
  };

  const parseFromInput = (val: string) => {
    return parseInt(val.replace(/\D/g, '')) || 0;
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>, type: 'soporte' | 'worker') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'soporte') setSoporteImagen(reader.result as string);
        else setWorkerPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      const newCierre: CierreCaja = {
        id: crypto.randomUUID(),
        fechaTurno: date,
        turno: Number(shift),
        startTime: new Date().toLocaleTimeString(),
        userId: user.id,
        userName: user.name,
        islaId: 'custom',
        islaName: `Islas (${islas.length})`,
        lecturas: [],
        ventaTeorica: totalIslas,
        efectivoDeclarado: totalDepositos,
        tarjetasDeclarado: totalTarjetas,
        valesDeclarado: totalCreditos + totalCopiloto + totalShellcard,
        totalDeclarado: totalRecaudado,
        descuadre: diferencia,
        status: CierreStatus.PENDIENTE,
        attachments: soporteImagen ? [soporteImagen] : [],
        workerPhoto: workerPhoto || undefined,
        notes: observaciones
      };
      
      await StorageService.saveCierre(newCierre);

      // Persist worker photo to user profile if it changed
      if (workerPhoto && workerPhoto !== user.photo) {
        await StorageService.saveUser({ ...user, photo: workerPhoto });
      }
      
      // Show success message
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        onTabChange('turno');
      }, 3000);
      
      // Reset images and notes for next session
      setSoporteImagen(null);
      setObservaciones('');
    } catch (e) {
      console.error('Error saving:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const steps = [
    { id: 'turno', label: 'Turno', num: 1 },
    { id: 'islas', label: 'Islas', num: 2 },
    { id: 'depositos', label: 'Depósitos', num: 3 },
    { id: 'pagos', label: 'Pagos', num: 4 },
    { id: 'cuadre', label: 'Cuadre', num: 5 }
  ];

  return (
    <div className="max-w-md mx-auto w-full">
      {/* STEPPER PROGRESS */}
      <div className="mb-8 overflow-hidden">
        <div className="flex items-center justify-between relative px-2">
          <div className="absolute left-6 right-6 top-3.5 h-[2px] bg-slate-200 z-0" />
          {steps.map((step, idx) => {
            const stepIndex = steps.findIndex(s => s.id === activeTab);
            const isActive = step.id === activeTab;
            const isCompleted = idx < stepIndex;

            return (
              <div 
                key={step.id} 
                className="relative z-10 flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => onTabChange(step.id)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  isActive ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/40 ring-4 ring-warning/30' : 
                  isCompleted ? 'bg-warning text-brand-700' : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider transition-colors ${
                  isActive ? 'text-brand-600' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'turno' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="t-turno">
            <div className="card-clean">
              <div className="flex flex-col items-center gap-2 mb-8 pb-6 border-b border-slate-50 text-center">
                <div className="mb-4 flex justify-center">
                  <img 
                    src="/shell-logo.png" 
                    alt="Logo Shell" 
                    className="w-14 h-14 object-contain"
                  />
                </div>
                {workerPhoto ? (
                  <div className="relative group">
                    <img 
                      src={workerPhoto} 
                      className="w-20 h-20 rounded-[2rem] object-cover shadow-xl border-4 border-white" 
                      alt="Worker" 
                    />
                    <button 
                      onClick={() => setWorkerPhoto(null)}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-2xl shadow-sm border border-brand-100 cursor-pointer hover:bg-brand-100 transition-all group">
                    <Camera className="w-7 h-7 text-brand-500 group-hover:scale-110 transition-transform" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="user" 
                      className="hidden" 
                      onChange={(e) => handleImageCapture(e, 'worker')} 
                    />
                  </label>
                )}
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Datos del Turno</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{workerPhoto ? 'Identidad Registrada' : 'Capture su Foto'}</p>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="label-micro text-center w-full mb-1">Fecha de Turno</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="input-clean text-center font-black uppercase tracking-widest cursor-pointer hover:border-warning transition-colors" 
                  />
                </div>
                
                <div>
                  <label className="label-micro text-center w-full mb-3 italic">Turno Seleccionado (T{shift})</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['1', '2', '3', '1M', '2M', '2A', '2AM', '3E', '3A', '3M', '3AM'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setShift(t)}
                        className={`py-3 rounded-xl text-xs font-black transition-all ${
                          shift === t ? 'bg-warning text-brand-900 shadow-lg shadow-warning/20 ring-2 ring-brand-500' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button 
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black text-sm py-5 rounded-2xl shadow-xl shadow-brand-600/20 active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 border-b-4 border-brand-800"
              onClick={() => onTabChange('islas')}
            >
              SIGUIENTE: CONFIGURAR ISLAS ⛽
              <ArrowRight className="w-4 h-4 text-warning" />
            </button>
          </motion.div>
        )}

        {activeTab === 'islas' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="t-islas">
            <div className="card-clean">
              <div className="flex flex-col items-center gap-2 mb-8 pb-6 border-b border-slate-50 text-center">
                <div className="w-14 h-14 rounded-2xl bg-warning text-brand-600 flex items-center justify-center text-2xl shadow-lg border-2 border-brand-500">⛽</div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight italic">Ventas por Isla</h2>
              </div>
              
              <div className="space-y-4 mb-6">
                {islas.map(isla => (
                  <div key={isla.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-[11px] font-black text-slate-400 border border-slate-200">
                          {isla.id}
                        </span>
                        <span className="font-black text-slate-700 uppercase tracking-tight">Isla {isla.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-brand-600">{formatCurrency(isla.comb + isla.noComb)}</span>
                        <button 
                          onClick={() => setIslas(islas.filter(i => i.id !== isla.id))}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-micro opacity-40">Combustible</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-right font-mono text-sm focus:border-brand-500 outline-none"
                          value={formatForInput(isla.comb)}
                          onChange={e => {
                            const val = parseFromInput(e.target.value);
                            setIslas(islas.map(i => i.id === isla.id ? { ...i, comb: val } : i));
                          }}
                        />
                      </div>
                      <div>
                        <label className="label-micro opacity-40">No Combustibles</label>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-right font-mono text-sm focus:border-brand-500 outline-none"
                          value={formatForInput(isla.noComb)}
                          onChange={e => {
                            const val = parseFromInput(e.target.value);
                            setIslas(islas.map(i => i.id === isla.id ? { ...i, noComb: val } : i));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIslas([...islas, { id: Math.max(...islas.map(i => i.id), 0) + 1, comb: 0, noComb: 0 }])}
                className="w-full py-4 border-2 border-dashed border-warning text-brand-600 bg-warning/5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-warning/10 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir Isla
              </button>

              <div className="mt-8 p-5 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-between">
                <span className="text-[11px] font-black text-brand-700 uppercase tracking-widest">Total Recaudado</span>
                <span className="text-xl font-black text-brand-600 font-mono tracking-tighter">{formatCurrency(totalIslas)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => onTabChange('turno')} className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase">Retroceder</button>
              <button onClick={() => onTabChange('depositos')} className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl shadow-brand-600/20">Depósitos 🏦</button>
            </div>
          </motion.div>
        )}

        {activeTab === 'depositos' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="t-depositos">
            <div className="card-clean">
              <div className="flex flex-col items-center gap-2 mb-8 pb-6 border-b border-slate-50 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-sm border border-emerald-100">🏦</div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Depósitos en Efectivo</h2>
              </div>
              
              <div className="space-y-2 mb-6">
                <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <span>N° Documento</span>
                  <span className="text-right">Monto ($)</span>
                  <span />
                </div>
                {depositos.map(dep => (
                  <div key={dep.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center">
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold outline-none focus:border-emerald-300"
                      placeholder="Doc."
                      value={dep.num}
                      onChange={e => setDepositos(depositos.map(d => d.id === dep.id ? { ...d, num: e.target.value } : d))}
                    />
                    <input 
                      type="text" 
                      inputMode="numeric"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs text-right font-mono outline-none focus:border-emerald-300"
                      placeholder="0"
                      value={formatForInput(dep.val)}
                      onChange={e => setDepositos(depositos.map(d => d.id === dep.id ? { ...d, val: parseFromInput(e.target.value) } : d))}
                    />
                    <button 
                      onClick={() => setDepositos(depositos.filter(d => d.id !== dep.id))}
                      className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setDepositos([...depositos, { id: Math.max(...depositos.map(d => d.id), 0) + 1, num: '', val: 0 }])}
                className="w-full py-4 border-2 border-dashed border-warning text-brand-600 bg-warning/5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-warning/10 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir Depósito
              </button>

              <div className="mt-8 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Total Efectivo</span>
                <span className="text-xl font-black text-emerald-600 font-mono tracking-tighter">{formatCurrency(totalDepositos)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => onTabChange('islas')} className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase">Retroceder</button>
              <button onClick={() => onTabChange('pagos')} className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl shadow-brand-600/20">Pago 💳</button>
            </div>
          </motion.div>
        )}

        {activeTab === 'pagos' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="t-pagos">
            <div className="card-clean p-0 overflow-hidden">
              <div className="flex flex-col items-center gap-2 p-6 border-b border-slate-50 bg-white text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-sm border border-purple-100">💳</div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Otros Pagos</h2>
              </div>
              
              <div className="p-5 bg-emerald-50/30 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Total Efectivo</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase italic">Sincronizado de depósitos</p>
                </div>
                <div className="text-xl font-black text-emerald-600 font-mono">{formatCurrency(totalDepositos)}</div>
              </div>

              {[
                { key: 'creditos', label: '🧾 Créditos', total: totalCreditos },
                { key: 'tarjetas', label: '💳 Tarjetas', total: totalTarjetas },
                { key: 'copiloto', label: '🛵 Mi Copiloto', total: totalCopiloto },
                { key: 'shellcard', label: '🛢 Shell Card', total: totalShellcard }
              ].map(section => (
                <div key={section.key} className="p-5 border-b border-slate-50 last:border-b-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">{section.label}</h3>
                    <span className="text-sm font-black text-slate-600 font-mono">{formatCurrency(section.total)}</span>
                  </div>
                  {pagos[section.key as keyof typeof pagos].map((p, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center">
                      <input 
                        type="text" 
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                        placeholder="Nota"
                        value={p.desc}
                        onChange={e => {
                          const newPagos = { ...pagos };
                          newPagos[section.key as keyof typeof pagos][idx].desc = e.target.value;
                          setPagos(newPagos);
                        }}
                      />
                      <input 
                        type="text" 
                        inputMode="numeric"
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-right font-mono"
                        placeholder="0"
                        value={formatForInput(p.val)}
                        onChange={e => {
                          const newPagos = { ...pagos };
                          newPagos[section.key as keyof typeof pagos][idx].val = parseFromInput(e.target.value);
                          setPagos(newPagos);
                        }}
                      />
                      <button 
                        onClick={() => {
                          const newPagos = { ...pagos };
                          newPagos[section.key as keyof typeof pagos] = newPagos[section.key as keyof typeof pagos].filter((_, i) => i !== idx);
                          setPagos(newPagos);
                        }}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newPagos = { ...pagos };
                      newPagos[section.key as keyof typeof pagos].push({ desc: '', val: 0 });
                      setPagos(newPagos);
                    }}
                    className="w-full py-2 border border-dashed border-slate-200 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    + Agregar Fila
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => onTabChange('depositos')} className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl font-black text-sm uppercase">Retroceder</button>
              <button onClick={() => onTabChange('cuadre')} className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-xl shadow-brand-600/20">Revisar 📊</button>
            </div>
          </motion.div>
        )}

        {activeTab === 'cuadre' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} key="t-cuadre">
            <div className="card-clean mb-6">
              <div className="flex flex-col items-center gap-2 mb-8 pb-6 border-b border-slate-50 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-800 flex items-center justify-center text-2xl shadow-sm border border-slate-200">📊</div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cierre de Caja</h2>
              </div>
              
              <div className="border border-slate-200 rounded-3xl overflow-hidden mb-6 divide-y divide-slate-100 bg-white shadow-sm">
                <div className="flex justify-between p-5 items-center">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Ventas</span>
                  <span className="text-xl font-black text-slate-800 font-mono tracking-tighter">{formatCurrency(totalIslas)}</span>
                </div>
                
                <div className="bg-slate-50 p-4 space-y-2">
                  {[
                    { label: 'Efectivo', val: totalDepositos, icon: '💵' },
                    { label: 'Créditos', val: totalCreditos, icon: '🧾' },
                    { label: 'Tarjetas', val: totalTarjetas, icon: '💳' },
                    { label: 'Copiloto', val: totalCopiloto, icon: '🛵' },
                    { label: 'Shell Card', val: totalShellcard, icon: '🛢' }
                  ].map(row => (
                    <div key={row.label} className="flex justify-between px-3 py-2 items-center bg-white rounded-xl border border-slate-200/50">
                      <span className="text-xs font-bold text-slate-500">{row.icon} {row.label}</span>
                      <span className="text-sm font-black font-mono text-slate-700">{formatCurrency(row.val)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between p-5 items-center bg-slate-50 border-t border-slate-200">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Total Recaudado</span>
                  <span className="text-xl font-black text-slate-800 font-mono">{formatCurrency(totalRecaudado)}</span>
                </div>
                
                <div className={`flex justify-between p-6 items-center border-t-4 ${
                  diferencia === 0 ? 'bg-slate-50 border-slate-900' : 
                  diferencia < 0 ? 'bg-red-50 border-red-500' : 'bg-emerald-50 border-emerald-500'
                }`}>
                  <span className="text-sm font-black uppercase tracking-widest">Diferencia</span>
                  <div className="text-right">
                    <span className={`text-3xl font-black font-mono tracking-tighter ${
                      diferencia === 0 ? 'text-slate-900' : 
                      diferencia < 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {diferencia > 0 ? '+' : ''}{formatCurrency(diferencia)}
                    </span>
                    <p className="text-[10px] font-black uppercase opacity-40 mt-1">
                      {diferencia === 0 ? 'CAJA CUADRADA' : diferencia < 0 ? 'FALTANTE' : 'SOBRANTE'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="label-micro px-2 flex items-center gap-2">
                    <Camera className="w-3 h-3 text-brand-500" />
                    Soporte Fotográfico (Cuadre Físico)
                  </label>
                  
                  {soporteImagen ? (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-brand-100 shadow-lg group">
                      <img src={soporteImagen} alt="Soporte" className="w-full h-48 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button 
                          onClick={() => setSoporteImagen(null)}
                          className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-slate-50 transition-all hover:border-brand-300 group">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-brand-50 transition-colors">
                        <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-brand-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Tomar Foto del Cuadre</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Soporte físico obligatorio</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={(e) => handleImageCapture(e, 'soporte')}
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-4">
                  <label className="label-micro px-2 flex items-center gap-2">
                    <FileText className="w-3 h-3 text-slate-400" />
                    Observaciones Extra
                  </label>
                  <textarea 
                    className="input-clean min-h-[100px] resize-none" 
                    placeholder="Detalla cualquier novedad del turno..."
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              className="w-full bg-brand-600 text-white font-black text-sm py-5 rounded-2xl shadow-xl shadow-brand-600/20 active:scale-95 transition-all mb-4 flex items-center justify-center gap-3 border-b-4 border-brand-800 uppercase tracking-widest italic"
            >
              <CheckCircle2 className="w-5 h-5 text-warning" />
              Guardar Rendición en Sistema
            </button>

            <AnimatePresence>
              {saveStatus === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-emerald-500 text-white p-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/30 mb-4 border-b-4 border-emerald-700"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-sm font-black uppercase tracking-widest">¡Guardado con éxito!</span>
                </motion.div>
              )}
              {saveStatus === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-red-500 text-white p-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-red-500/30 mb-4 border-b-4 border-red-700"
                >
                  <XCircle className="w-6 h-6" />
                  <span className="text-sm font-black uppercase tracking-widest">Error al guardar</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER DESARROLLADOR */}
      <div className="mt-12 mb-8 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-[1px] w-8 bg-slate-200" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Diseñado por</span>
          <div className="h-[1px] w-8 bg-slate-200" />
        </div>
        <span className="text-xs font-black tracking-widest text-slate-800 mb-4">
          ORANGEL CAMERO
        </span>
        
        {/* CONTACT LINKS */}
        <div className="flex gap-4">
          <a 
            href="https://wa.me/56929393918?text=Hola%20Orangel,%20estoy%20usando%20tu%20aplicación%20de%20Shell%20y%20me%20gustaría%20contactarte." 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 text-[#075e54] rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-[#25D366]/20 transition-all border border-[#25D366]/20"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
          <a 
            href="mailto:orangelcamero26@gmail.com" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Mail className="w-4 h-4" /> Correo
          </a>
        </div>
      </div>
    </div>
  );
}


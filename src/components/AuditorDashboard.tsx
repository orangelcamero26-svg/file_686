/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  FileText,
  FileDown,
  ChevronRight,
  RefreshCcw,
  ArrowDownToLine,
  X,
  Trash2,
  Edit,
  Users as UsersIcon,
  Plus,
  Mail,
  MessageCircle,
  Shield,
  Key,
  Camera,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, CierreCaja, CierreStatus, UserRole } from '../types.ts';
import { StorageService } from '../lib/storage.ts';

interface Props {
  user: User;
}

export default function AuditorDashboard({ user }: Props) {
  const [activeTab, setActiveTab] = useState<'audit' | 'users'>('audit');
  
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [selectedCierre, setSelectedCierre] = useState<CierreCaja | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todos' | 'pendiente' | 'aprobado'>('todos');
  const [auditNote, setAuditNote] = useState('');

  // Confirmation Drawer
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'cierre' | 'user' } | null>(null);

  // Users State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    role: UserRole.OPERATOR
  });

  const loadData = async () => {
    const data = await StorageService.getCierres();
    setCierres(data.sort((a, b) => new Date(b.fechaTurno).getTime() - new Date(a.fechaTurno).getTime()));
    
    const users = await StorageService.getUsers();
    setAllUsers(users);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert('Por favor complete todos los campos');
      return;
    }

    const userToSave: User = {
      id: editingUser ? editingUser.id : crypto.randomUUID(),
      name: newUser.name!,
      email: newUser.email!,
      password: newUser.password!,
      role: newUser.role as UserRole
    };

    await StorageService.saveUser(userToSave);
    setIsAddingUser(false);
    setEditingUser(null);
    setNewUser({ role: UserRole.OPERATOR });
    await loadData();
    alert(editingUser ? 'Usuario actualizado con éxito' : 'Usuario creado con éxito');
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setNewUser({
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role
    });
    setIsAddingUser(true);
  };

  const handleDeleteUser = (id: string) => {
    setConfirmDelete({ id, type: 'user' });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'user') {
      if (confirmDelete.id === user.id) {
        alert("No puedes eliminar tu propio usuario por seguridad.");
        setConfirmDelete(null);
        return;
      }
      await StorageService.deleteUser(confirmDelete.id);
    } else {
      await StorageService.deleteCierre(confirmDelete.id);
    }

    await loadData();
    setConfirmDelete(null);
  };

  const handleExportAllZip = async () => {
    if (cierres.length === 0) return;

    const zip = new JSZip();
    const photosFolder = zip.folder("fotos_evidencia");
    
    // 1. Create Data CSV
    const headers = ['ID', 'Fecha', 'Atendedor', 'Turno', 'Isla', 'Venta Bruta', 'Recaudado', 'Diferencia', 'Estado', 'Notas'];
    const rows = cierres.map(c => [
      c.id,
      c.fechaTurno,
      c.userName,
      `T${c.turno}`,
      c.islaName,
      c.stats?.ventaTotal || 0,
      c.stats?.recaudadoTotal || 0,
      c.stats?.diferencia || 0,
      c.status,
      (c.notes || '').replace(/,/g, ';')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    zip.file("datos_rendiciones.csv", csvContent);

    // 2. Add Photos
    const promises = cierres.map(async (c) => {
      if (c.attachments && c.attachments.length > 0) {
        const imageUrl = c.attachments[0];
        try {
          // If it's a base64 string
          if (imageUrl.startsWith('data:')) {
            const base64Data = imageUrl.split(',')[1];
            photosFolder?.file(`rendicion_${c.userName}_${c.fechaTurno}_${c.id.slice(0, 4)}.jpg`, base64Data, { base64: true });
          } else {
            // If it's a URL (mostly for local development or if stored in cloud)
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            photosFolder?.file(`rendicion_${c.userName}_${c.fechaTurno}_${c.id.slice(0, 4)}.jpg`, blob);
          }
        } catch (error) {
          console.error(`Error adding image ${c.id}:`, error);
        }
      }
    });

    await Promise.all(promises);

    // 3. Generate and Save ZIP
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `RESPALDO_SHELL_${new Date().toISOString().split('T')[0]}.zip`);
  };

  const handleExportPDF = async () => {
    if (cierres.length === 0) return;

    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    
    // Header Shell Style
    doc.setFillColor(238, 28, 37); // Shell Red
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTACIÓN DIGITAL', 15, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(255, 206, 0); // Shell Yellow
    doc.text('REPORTE OFICIAL DE RENDICIONES SHELL', 15, 28);
    
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 150, 20);

    const tableData = cierres.map(c => [
      c.fechaTurno,
      c.userName,
      `T${c.turno}`,
      c.islaName,
      `$${(c.stats?.ventaTotal || 0).toLocaleString()}`,
      `$${(c.stats?.recaudadoTotal || 0).toLocaleString()}`,
      `$${(c.stats?.diferencia || 0).toLocaleString()}`,
      c.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Fecha', 'Atendedor', 'Turno', 'Isla', 'Venta', 'Recaudado', 'Diff', 'Estado']],
      body: tableData,
      headStyles: { 
        fillColor: [238, 28, 37], 
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'center', fontStyle: 'bold' }
      }
    });

    doc.save(`REPORTE_SHELL_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportSinglePDF = async (record: CierreCaja) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    
    // Shell Header
    doc.setFillColor(238, 28, 37);
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE CIERRE', 15, 25);
    doc.setFontSize(10);
    doc.setTextColor(255, 206, 0);
    doc.text(`REGISTRO DIGITAL SHELL - ${record.id.slice(0, 8)}`, 15, 35);

    // Basic Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Información General', 15, 65);
    
    autoTable(doc, {
      startY: 70,
      body: [
        ['Atendedor:', record.userName],
        ['Fecha de Turno:', record.fechaTurno],
        ['Turno:', `T${record.turno}`],
        ['Isla:', record.islaName],
        ['Estado:', record.status.toUpperCase()]
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    // Financial Data
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Resumen Financiero', 15, finalY);
    
    autoTable(doc, {
      startY: finalY + 5,
      body: [
        ['Venta Teórica:', `$${record.ventaTeorica.toLocaleString()}`],
        ['Efectivo Declarado:', `$${record.efectivoDeclarado.toLocaleString()}`],
        ['Tarjetas Declarado:', `$${record.tarjetasDeclarado.toLocaleString()}`],
        ['Vales Declarado:', `$${record.valesDeclarado.toLocaleString()}`],
        ['Diferencia:', `$${record.descuadre.toLocaleString()}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [238, 28, 37] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { halign: 'right' } }
    });

    if (record.notes) {
      const notesY = (doc as any).lastAutoTable.finalY + 10;
      doc.text('Observaciones:', 15, notesY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(record.notes, 15, notesY + 10, { maxWidth: 180 });
    }

    doc.save(`rendicion_${record.userName}_${record.fechaTurno}.pdf`);
  };

  const handleExportCSV = () => {
    if (cierres.length === 0) return;

    const headers = ['Fecha', 'Atendedor', 'Turno', 'Isla', 'Venta Bruta', 'Recaudado', 'Diferencia', 'Estado'];
    const rows = cierres.map(c => [
      c.fechaTurno,
      c.userName,
      c.turno,
      c.islaName,
      c.stats?.ventaTotal || 0,
      c.stats?.recaudadoTotal || 0,
      c.stats?.diferencia || 0,
      c.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_shell_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCierres = cierres.filter(c => {
    const matchesSearch = c.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.islaName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'todos' || c.status.toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const handleAction = async (status: CierreStatus) => {
    if (!selectedCierre) return;

    const updatedCierre: CierreCaja = {
      ...selectedCierre,
      status,
      supervisorId: user.id,
      notes: auditNote
    };

    await StorageService.saveCierre(updatedCierre);
    await loadData();
    setSelectedCierre(null);
    setAuditNote('');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDelete({ id, type: 'cierre' });
  };

  // KPI Calculations
  const stats = {
    total: filteredCierres.length,
    venta: filteredCierres.reduce((acc, c) => acc + c.ventaTeorica, 0),
    recaudado: filteredCierres.reduce((acc, c) => acc + (c.efectivoDeclarado + c.tarjetasDeclarado + c.valesDeclarado), 0),
    balance: filteredCierres.reduce((acc, c) => acc + c.descuadre, 0)
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8 relative group">
        <div className="absolute -left-4 top-0 bottom-0 w-2 bg-warning rounded-full" />
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex w-20 h-20 bg-white rounded-3xl border border-slate-100 items-center justify-center shadow-xl shadow-brand-500/5 p-2 overflow-hidden">
            <img 
              src="/shell-logo.png" 
              alt="Logo Shell" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Auditoría Shell Central</h1>
            <div className="flex items-center gap-1 mt-3">
            {[
              { id: 'audit', label: 'Cierres de Caja', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'users', label: 'Gestión Usuarios', icon: <UsersIcon className="w-3.5 h-3.5" /> }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === t.id 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                    : 'text-slate-400 hover:bg-slate-100 border border-transparent hover:border-warning'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

        <div className="flex gap-2">
          <button onClick={loadData} className="bg-slate-50 border border-slate-200 text-slate-600 font-bold text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
            <RefreshCcw className="w-3 h-3" /> Actualizar
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center gap-2"
          >
            <ArrowDownToLine className="w-3 h-3" /> Excel
          </button>
          <button 
            onClick={handleExportPDF}
            className="bg-red-50 text-red-600 border border-red-100 font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
          >
            <FileText className="w-3 h-3" /> PDF
          </button>
          <button 
            onClick={handleExportAllZip}
            className="bg-slate-900 text-white font-black text-[10px] px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
          >
            <Archive className="w-3 h-3 text-warning" /> Respaldar Todo (ZIP)
          </button>
        </div>
      </header>

      {activeTab === 'audit' && (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
          {/* KPI SUMMARY */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Turnos', val: stats.total, icon: '👤', cls: 'text-slate-800 border-l-4 border-slate-400' },
          { label: 'Venta Total', val: `$${stats.venta.toLocaleString('es-CL')}`, icon: '⛽', cls: 'text-brand-600 border-l-4 border-brand-400' },
          { label: 'Recaudado', val: `$${stats.recaudado.toLocaleString('es-CL')}`, icon: '💳', cls: 'text-emerald-600 border-l-4 border-emerald-400' },
          { label: 'Balance Neto', val: (stats.balance > 0 ? '+' : '') + stats.balance.toLocaleString('es-CL'), icon: '📊', 
            cls: stats.balance < 0 ? 'text-alert border-l-4 border-alert' : stats.balance > 0 ? 'text-warning border-l-4 border-warning' : 'text-success border-l-4 border-success' }
        ].map((k, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{k.label}</p>
              <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm">{k.icon}</div>
            </div>
            <p className={`text-xl font-black font-mono tracking-tighter ${k.cls} pl-2`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center mb-6 gap-2">
        <div className="flex-1 flex items-center gap-3 px-4 py-2 w-full">
          <Search className="w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            placeholder="Buscar por atendedor o isla..."
            className="bg-transparent border-none focus:outline-none text-sm w-full font-bold text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100 w-full sm:w-auto">
          {['todos', 'pendiente', 'aprobado'].map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt as any)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === opt ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Fecha Registro</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Personal Responsable</th>
              <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Detalle de Operación</th>
              <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Venta Islas</th>
              <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Diferencia</th>
              <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Estado</th>
              <th className="px-6 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCierres.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center opacity-30">
                  <FileText className="w-12 h-12 mx-auto mb-3" />
                  <p className="font-black uppercase tracking-[0.2em] text-xs">Sin registros</p>
                </td>
              </tr>
            )}
            {filteredCierres.map(c => (
              <motion.tr 
                key={c.id} 
                layoutId={c.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => setSelectedCierre(c)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-11 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col items-center">
                      <div className="bg-brand-500 w-full text-[7px] font-black text-white text-center py-0.5 uppercase tracking-widest">
                        {new Date(c.fechaTurno + 'T00:00:00').toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')}
                      </div>
                      <div className="flex-1 flex items-center justify-center text-xs font-black text-slate-800">
                        {c.fechaTurno.split('-')[2]}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        {c.fechaTurno.split('-')[0]}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-black text-slate-800 uppercase text-xs tracking-tight whitespace-nowrap">{c.userName}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Estación Digital</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">T{c.turno}</span>
                    <span className="opacity-40">|</span>
                    <span>{c.islaName}</span>
                    {c.attachments && c.attachments.length > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(c.attachments![0]);
                        }}
                        className="bg-brand-50 p-1.5 rounded-lg border border-brand-100 hover:bg-brand-100 transition-all ml-1 group/cam"
                      >
                        <Camera className="w-3.5 h-3.5 text-brand-600 group-hover/cam:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono font-bold text-slate-600 text-sm italic">${c.ventaTeorica.toLocaleString('es-CL')}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-mono font-black text-sm ${c.descuadre < 0 ? 'text-alert' : c.descuadre > 0 ? 'text-warning' : 'text-success'}`}>
                    {c.descuadre > 0 ? '+' : ''}{c.descuadre.toLocaleString('es-CL')}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm border ${
                    c.status === CierreStatus.PENDIENTE ? 'bg-warning/10 text-warning border-warning/20' : 
                    c.status === CierreStatus.APROBADO ? 'bg-success/10 text-success border-success/20' : 'bg-alert/10 text-alert border-alert/20'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-3">
                    {(user.role === UserRole.ADMIN || user.role === UserRole.SUPERVISOR) && (
                      <button 
                        onClick={(e) => handleDelete(e, c.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-brand-500 transition-colors" />
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Personal Registrado</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control de accesos y perfiles</p>
            </div>
            <button 
              onClick={() => {
                setEditingUser(null);
                setNewUser({ role: UserRole.OPERATOR });
                setIsAddingUser(true);
              }}
              className="bg-brand-600 text-white font-black text-[10px] px-6 py-3 rounded-2xl uppercase tracking-widest shadow-xl shadow-brand-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Usuario
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => handleEditUser(u)}
                    className="p-3 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-2xl transition-all border border-transparent hover:border-brand-100"
                    title="Editar Usuario"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                    title="Eliminar Usuario"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shadow-inner border border-slate-100">👤</div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase text-sm tracking-tight">{u.name}</h3>
                    <div className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider inline-block mt-1 ${
                      u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                      u.role === UserRole.SUPERVISOR ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-brand-50 text-brand-600 border border-brand-100'
                    }`}>
                      {u.role}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-[11px] font-bold lowercase tracking-tight">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Key className="w-4 h-4" />
                    <span className="text-[11px] font-black tracking-widest uppercase">Pin: {u.password}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {isAddingUser && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddingUser(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative z-10 border border-slate-200">
                  <div className="flex flex-col items-center gap-2 mb-8 text-center">
                    <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600 mb-2">
                      {editingUser ? <Edit className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                      {editingUser ? 'Editar Usuario' : 'Crear Nuevo Perfil'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {editingUser ? 'Modifique los datos del colaborador' : 'Ingrese los datos del colaborador'}
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="label-micro">Nombre Completo</label>
                      <input 
                        className="input-clean" 
                        placeholder="Ej: Juan Soto"
                        value={newUser.name || ''}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="label-micro">Correo Institucional</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          className="input-clean pl-10" 
                          placeholder="usuario@ecoflow.com"
                          value={newUser.email || ''}
                          onChange={e => setNewUser({...newUser, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-micro">Rol / Cargo</label>
                        <select 
                          className="input-clean cursor-pointer text-xs font-bold"
                          value={newUser.role}
                          onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                        >
                          <option value={UserRole.OPERATOR}>Atendedor</option>
                          <option value={UserRole.SUPERVISOR}>Supervisor</option>
                          <option value={UserRole.ADMIN}>Administrador</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-micro">Password / PIN</label>
                        <div className="relative">
                          <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input 
                            className="input-clean pl-10" 
                            placeholder="1234"
                            value={newUser.password || ''}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        onClick={() => {
                          setIsAddingUser(false);
                          setEditingUser(null);
                          setNewUser({ role: UserRole.OPERATOR });
                        }}
                        className="flex-1 py-4 border border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleCreateUser}
                        className="flex-[2] py-4 bg-brand-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-brand-600/20 active:scale-95 transition-all"
                      >
                        {editingUser ? 'Actualizar' : 'Guardar Usuario'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* AUDIT DRAWER / MODAL */}
      <AnimatePresence>
        {selectedCierre && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCierre(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-lg h-full bg-white relative z-10 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  {selectedCierre.workerPhoto ? (
                    <img 
                      src={selectedCierre.workerPhoto} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-warning shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">👤</div>
                  )}
                  <div>
                    <p className="label-micro text-brand-500 mb-1 italic">Revisión de Auditoría Shell</p>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">{selectedCierre.userName}</h2>
                  </div>
                </div>
                <button onClick={() => setSelectedCierre(null)} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-100 transition-all">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* ACTION BAR IN MODAL */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleExportSinglePDF(selectedCierre)}
                    className="flex-1 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" /> Descargar PDF
                  </button>
                  {selectedCierre.status === CierreStatus.PENDIENTE && (
                    <>
                      <button 
                        onClick={() => handleAction(CierreStatus.APROBADO)}
                        className="flex-1 bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Aprobar
                      </button>
                      <button 
                        onClick={() => handleAction(CierreStatus.RECHAZADO)}
                        className="flex-1 bg-alert text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl shadow-lg shadow-alert/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Rechazar
                      </button>
                    </>
                  )}
                </div>

                {/* FINANCIAL BLOCKS */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Venta', val: selectedCierre.ventaTeorica, cls: 'text-slate-800' },
                    { label: 'Recaudado', val: (selectedCierre.efectivoDeclarado + selectedCierre.tarjetasDeclarado + selectedCierre.valesDeclarado), cls: 'text-slate-800' },
                    { label: 'Neto', val: selectedCierre.descuadre, cls: selectedCierre.descuadre < 0 ? 'text-alert' : 'text-success' }
                  ].map(k => (
                    <div key={k.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                      <p className={`text-sm font-black font-mono ${k.cls}`}>${k.val.toLocaleString('es-CL')}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
                    Desglose de Recaudación
                  </h3>
                  <div className="bg-white border-2 border-slate-50 rounded-3xl p-6 space-y-4 shadow-sm">
                    {[
                      { label: 'Efectivo en Caja', val: selectedCierre.efectivoDeclarado, icon: '💵' },
                      { label: 'Depósito Tarjetas', val: selectedCierre.tarjetasDeclarado, icon: '💳' },
                      { label: 'Vales / Convenios', val: selectedCierre.valesDeclarado, icon: '📜' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center group">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                          <span className="text-sm opacity-60 group-hover:opacity-100 transition-opacity">{row.icon}</span>
                          {row.label}
                        </span>
                        <span className="font-mono font-bold text-slate-500">${row.val.toLocaleString('es-CL')}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Balance Final</span>
                      <span className={`text-xl font-black font-mono ${selectedCierre.descuadre < 0 ? 'text-alert' : 'text-success'}`}>
                        ${selectedCierre.descuadre.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedCierre.attachments && selectedCierre.attachments.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full"></span>
                      Evidencia Fotográfica
                    </h3>
                    <div className="relative group rounded-[2rem] overflow-hidden border border-slate-200 shadow-xl bg-slate-100 cursor-zoom-in" onClick={() => setPreviewImage(selectedCierre.attachments![0])}>
                      <img 
                        src={selectedCierre.attachments[0]} 
                        alt="Soporte Físico" 
                        className="w-full h-auto max-h-[300px] object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white text-slate-900 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                          <Search className="w-3 h-3" /> Ampliar Imagen
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    Observaciones Técnicas
                  </h3>
                  {selectedCierre.status === CierreStatus.PENDIENTE ? (
                    <div className="space-y-4">
                      <textarea 
                        className="input-clean min-h-[140px] resize-none text-[11px] p-6 leading-relaxed"
                        placeholder="Ingrese notas de auditoría o justificaciones de descuadre..."
                        value={auditNote}
                        onChange={e => setAuditNote(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 italic text-xs text-slate-500 leading-relaxed">
                      "{selectedCierre.notes || 'Sin notas de auditoría registradas.'}"
                    </div>
                  )}
                </div>
              </div>

              {selectedCierre.status === CierreStatus.PENDIENTE && (
                <div className="p-8 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleAction(CierreStatus.RECHAZADO)}
                    className="py-5 rounded-[1.25rem] border-2 border-alert text-alert font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-alert hover:text-white transition-all shadow-lg shadow-alert/5 active:scale-95"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                  <button 
                    onClick={() => handleAction(CierreStatus.APROBADO)}
                    className="py-5 rounded-[1.25rem] bg-success text-white font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-success/20 hover:bg-[#0da270] transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprobar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX / FULL IMAGE PREVIEW */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col items-center"
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-16 right-0 bg-warning text-brand-900 px-6 py-3 rounded-2xl flex items-center gap-2 font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-2xl hover:scale-105 active:scale-95"
              >
                Cerrar Vista <X className="w-5 h-5" />
              </button>
              <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-warning/50">
                <img 
                  src={previewImage} 
                  alt="Vista Ampliada" 
                  className="w-full h-auto max-h-[70vh] object-contain rounded-[2rem]" 
                />
              </div>
              <div className="mt-8 text-center bg-white/5 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/10">
                <p className="text-white font-black uppercase text-[10px] tracking-[0.4em]">Evidencia Fotográfica Shell</p>
                <p className="text-warning font-mono text-[9px] mt-2 italic uppercase tracking-widest">Documento Digital Verificado</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl relative z-10 border border-slate-200 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2 italic">Confirmar Acción</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">
                ¿Estás seguro que deseas eliminar {confirmDelete.type === 'user' ? 'este usuario' : 'esta rendición'}? 
                Esta acción es irreversible.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmDelete}
                  className="w-full py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                >
                  Sí, Eliminar Permanentemente
                </button>
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="w-full py-4 border border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER DESARROLLADOR */}
      <div className="mt-20 mb-8 flex flex-col items-center">
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

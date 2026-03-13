import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/axios';
import { UserPlus, Edit2, Shield, User } from 'lucide-react';

export const AdminClients = () => {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ nombre: '', numero: '', cuit: '', email: '', aumento: '0', estado: 'ACTIVO' });

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await api.get('/clients');
            setClients(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openNew = () => {
        setEditingId(null);
        setFormData({ nombre: '', numero: '', cuit: '', email: '', aumento: '0', estado: 'ACTIVO' });
        setShowModal(true);
    };

    const openEdit = (client: any) => {
        setEditingId(client.id);
        setFormData({
            nombre: client.nombre,
            numero: client.numero,
            cuit: client.cuit,
            email: client.email || '',
            aumento: client.porcentajeaumento.toString(),
            estado: client.estado
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/clients/${editingId}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            setShowModal(false);
            fetchClients();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error guardando cliente');
        }
    };

    return (
        <div className="space-y-8 text-gray-200">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Gestión de Clientes</h1>
                    <p className="text-gray-500 mt-2 font-medium">Crea, modifica y suspende accesos al sistema.</p>
                </div>
                <button
                    onClick={openNew}
                    className="bg-primary-500 text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-400 transition-all flex items-center shadow-[0_5px_15px_rgba(255,184,0,0.2)] active:scale-95"
                >
                    <UserPlus className="w-5 h-5 mr-3" />
                    Nuevo Cliente
                </button>
            </div>

            <div className="bg-surface rounded-2xl shadow-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-[#1A1A1A]">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Credenciales</th>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Aumento</th>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                <th scope="col" className="relative px-6 py-4"><span className="sr-only">Editar</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Cargando...</td></tr>
                            ) : clients.map(client => (
                                <tr key={client.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-12 w-12 bg-[#2a2a2a] rounded-xl flex items-center justify-center border border-white/5 group-hover:border-primary-500/30 transition-all">
                                                <User className="h-6 w-6 text-primary-500" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-white group-hover:text-primary-500 transition-colors uppercase tracking-tight">{client.nombre}</div>
                                                <div className="text-xs text-gray-500 font-medium">{client.email || '—'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="text-[10px] text-primary-500 font-black bg-primary-500/10 px-2 py-1 rounded border border-primary-500/20 inline-block mb-1 tabular-nums tracking-widest">{client.numero}</div>
                                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">PSW: {client.cuit}</div>
                                    </td>
                                    <td className="px-6 py-5 text-sm">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black bg-white/5 text-gray-400 border border-white/5">
                                            {client.porcentajeaumento > 0 ? `+${client.porcentajeaumento}` : client.porcentajeaumento}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${client.estado === 'ACTIVO' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                            {client.estado === 'ACTIVO' ? 'Activo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button onClick={() => openEdit(client)} className="text-gray-500 hover:text-primary-500 p-2.5 rounded-xl hover:bg-white/5 transition-all">
                                            <Edit2 className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-black/80 transition-opacity backdrop-blur-sm" aria-hidden="true" onClick={() => setShowModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-surface rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl w-full border border-white/10 backdrop-blur-3xl bg-opacity-80">
                            <form onSubmit={handleSubmit}>
                                <div className="px-8 pt-8 pb-6 sm:p-10 sm:pb-4">
                                    <h3 className="text-xl font-black text-white mb-8 flex items-center uppercase tracking-widest border-b border-white/5 pb-5" id="modal-title">
                                        <Shield className="w-6 h-6 mr-3 text-primary-500" />
                                        {editingId ? 'Actualizar Ficha' : 'Nueva Alta Cliente'}
                                    </h3>
 
                                    <div className="space-y-6">
                                        <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Razón Social</label>
                                            <input required type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full bg-[#121212] border border-white/5 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-700" placeholder="Nombre completo" /></div>
 
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Usuario (Nº)</label>
                                                <input required type="text" value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} className="w-full bg-[#121212] border border-white/5 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all tabular-nums" /></div>
 
                                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Contraseña (CUIT)</label>
                                                <input required type="text" value={formData.cuit} onChange={e => setFormData({ ...formData, cuit: e.target.value })} className="w-full bg-[#121212] border border-white/5 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" /></div>
                                        </div>
 
                                        <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Email Corporativo</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-[#121212] border border-white/5 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" /></div>
 
                                        <div className="grid grid-cols-2 gap-6">
                                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Aumento (%)</label>
                                                <input required step="0.1" type="number" value={formData.aumento} onChange={e => setFormData({ ...formData, aumento: e.target.value })} className="w-full bg-[#121212] border border-white/5 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all" /></div>
 
                                            <div><label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Estado Cuenta</label>
                                                <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="block w-full bg-[#121212] border border-white/5 rounded-2xl py-4 px-5 text-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all appearance-none">
                                                    <option value="ACTIVO">HABILITADO</option>
                                                    <option value="INACTIVO">SUSPENDIDO</option>
                                                </select></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-8 py-8 sm:px-10 flex justify-end space-x-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl text-gray-500 font-bold hover:text-white transition-colors uppercase text-xs tracking-widest">Cancelar</button>
                                    <button type="submit" className="bg-primary-500 text-black px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-primary-400 transition-all shadow-[0_5px_15px_rgba(255,184,0,0.2)]">Guardar Cambios</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

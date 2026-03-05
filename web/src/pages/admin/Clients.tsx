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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
                    <p className="text-gray-600 mt-1">Crea, modifica y suspende accesos al sistema.</p>
                </div>
                <button
                    onClick={openNew}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center shadow-sm"
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Nuevo Cliente
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario / Contraseña</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aumento</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Editar</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Cargando...</td></tr>
                            ) : clients.map(client => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-primary-600" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{client.nombre}</div>
                                                <div className="text-sm text-gray-500">{client.email || 'Sin email'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded inline-block mb-1 border border-gray-200">{client.numero}</div>
                                        <div className="text-xs text-gray-500">Pass: {client.cuit}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {(client.porcentajeaumento * 100 - 100).toFixed(0)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.estado === 'ACTIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {client.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <button onClick={() => openEdit(client)} className="text-primary-600 hover:text-primary-900 p-2 rounded-full hover:bg-primary-50 transition-colors">
                                            <Edit2 className="h-4 w-4" />
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
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center" id="modal-title">
                                        <Shield className="w-5 h-5 mr-2 text-primary-600" />
                                        {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
                                    </h3>

                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium text-gray-700">Nombre Completo / Empresa</label>
                                            <input required type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" /></div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium text-gray-700">Usuario (Nº)</label>
                                                <input required type="text" value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" /></div>

                                            <div><label className="block text-sm font-medium text-gray-700">Contraseña (CUIT)</label>
                                                <input required type="text" value={formData.cuit} onChange={e => setFormData({ ...formData, cuit: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" /></div>
                                        </div>

                                        <div><label className="block text-sm font-medium text-gray-700">Email (Opcional)</label>
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" /></div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium text-gray-700">Coeficiente Precio (Ej: 1.2 o 0.9)</label>
                                                <input required step="0.01" min="0" type="number" value={formData.aumento} onChange={e => setFormData({ ...formData, aumento: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" /></div>

                                            <div><label className="block text-sm font-medium text-gray-700">Estado</label>
                                                <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
                                                    <option value="ACTIVO">Activo</option>
                                                    <option value="INACTIVO">Inactivo</option>
                                                </select></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end space-x-3">
                                    <button type="button" onClick={() => setShowModal(false)} className="bg-white border text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md font-medium">Cancelar</button>
                                    <button type="submit" className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md font-medium shadow-sm">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/axios';
import { Upload, Tag, Users, TrendingUp, Activity, Award } from 'lucide-react';

interface Stats {
    orders30d: number;
    activeClients30d: number;
    totalClients: number;
    topClients: { nombre: string; total_pedidos: number }[];
}

export const AdminImport = () => {
    const [status, setStatus] = useState<{ lista: string | null, ofertas: string | null, cambios: string }>({ lista: null, ofertas: null, cambios: '' });

    // Ofertas Form
    const [ofertasFile, setOfertasFile] = useState<File | null>(null);
    const [ofertasLoading, setOfertasLoading] = useState(false);

    // Global App Config
    const [showStockConfig, setShowStockConfig] = useState<boolean>(true);
    const [configLoading, setConfigLoading] = useState(false);

    // Stats
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        fetchStatus();
        fetchConfig();
        fetchStats();
    }, []);

    const fetchConfig = async () => {
        try {
            const { data } = await api.get('/config');
            setShowStockConfig(data.data.show_stock_to_clients === '1');
        } catch (error) {
            console.error('Error fetching config');
        }
    };

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/admin/statistics');
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats');
        }
    };

    const toggleStockVisibility = async () => {
        const newValue = !showStockConfig;
        setConfigLoading(true);
        try {
            await api.post('/config', {
                key: 'show_stock_to_clients',
                value: newValue ? '1' : '0'
            });
            setShowStockConfig(newValue);
        } catch (error) {
            alert('Error al guardar la configuración');
        } finally {
            setConfigLoading(false);
        }
    };

    const fetchStatus = async () => {
        try {
            const { data } = await api.get('/import/status');
            setStatus(data);
        } catch (error) {
            console.error('Error fetching import status');
        }
    };

    const handleOfertasSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ofertasFile) return;

        setOfertasLoading(true);
        const formData = new FormData();
        formData.append('file', ofertasFile);

        try {
            const res = await api.post('/import/ofertas', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`Ofertas actualizadas. Faltantes: ${res.data.faltan.length}`);
            setOfertasFile(null);
            fetchStatus();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al actualizar ofertas');
        } finally {
            setOfertasLoading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Nunca';
        return new Date(dateStr).toLocaleString('es-AR');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-gray-200">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Sistema</h1>
                <p className="text-gray-500 mt-2 font-medium">Panel general de administración, estadísticas y actualizaciones del sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Status Card */}
                <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 col-span-1 md:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                    <div>
                        <h3 className="font-black text-white uppercase tracking-widest text-xs border-b border-white/5 pb-2 mb-4">Estado de sincronización</h3>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">Vigencia Ofertas: <span className="font-bold text-red-500 ml-2">{formatDate(status.ofertas)}</span></p>
                        </div>
                    </div>
                    {status.cambios && (
                        <div className="bg-primary-500/10 text-primary-200 p-5 rounded-xl max-w-sm text-sm border border-primary-500/20 backdrop-blur-md">
                            <span className="font-black block mb-2 uppercase tracking-tighter text-primary-500">Últimos aumentos aplicados:</span>
                            <p className="font-medium">{status.cambios}</p>
                        </div>
                    )}
                </div>

                {/* Stats Dashboard */}
                {stats && (
                    <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 col-span-1 md:col-span-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                        <h2 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest">
                            <Activity className="w-5 h-5 text-green-500 mr-3" />
                            Estadísticas de Uso (Últimos 30 días)
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex items-center gap-4 group hover:border-green-500/30 transition-all">
                                <div className="p-3 bg-green-500/10 rounded-xl text-green-500 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Pedidos</p>
                                    <p className="text-2xl font-black text-white">{stats.orders30d}</p>
                                </div>
                            </div>
                            
                            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex items-center gap-4 group hover:border-blue-500/30 transition-all">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Clientes Activos</p>
                                    <p className="text-2xl font-black text-white">{stats.activeClients30d} <span className="text-xs text-gray-600 font-bold ml-1">/ {stats.totalClients}</span></p>
                                </div>
                            </div>

                            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 flex items-center gap-4 group hover:border-primary-500/30 transition-all">
                                <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500 group-hover:scale-110 transition-transform">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-1">Top Cliente</p>
                                    <p className="text-sm font-black text-white truncate" title={stats.topClients[0]?.nombre || 'N/A'}>
                                        {stats.topClients[0] ? stats.topClients[0].nombre : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {stats.topClients.length > 0 && (
                            <div className="mt-6 border-t border-white/5 pt-6">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Top 5 Clientes Más Activos (Histórico)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {stats.topClients.map((client, i) => (
                                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                                            <span className="text-xs font-bold text-gray-300 line-clamp-2 uppercase leading-tight mb-2" title={client.nombre}>
                                                {client.nombre}
                                            </span>
                                            <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">
                                                {client.total_pedidos} pedidos
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Ofertas Upload */}
                <div className="md:col-start-1 md:col-span-1">
                    <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden group h-full">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"></div>
                        <h2 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest">
                            <Tag className="w-5 h-5 text-red-600 mr-3" />
                            Ofertas
                        </h2>
                        <p className="text-xs text-gray-500 mb-8 font-medium">Sube el archivo <code className="bg-black/50 text-red-400 px-2 py-1 rounded-md">ofertas.txt</code> para actualizar precios promocionales.</p>
    
                        <form onSubmit={handleOfertasSubmit} className="space-y-6">
                            <div className="border-2 border-dashed border-white/5 rounded-2xl p-8 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-all cursor-pointer">
                                <input
                                    type="file"
                                    accept=".txt"
                                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-red-600 file:text-white hover:file:bg-red-500 transition-all"
                                    onChange={(e) => setOfertasFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!ofertasFile || ofertasLoading}
                                className="w-full bg-red-600 text-white rounded-xl py-4 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-500 shadow-[0_5px_20px_rgba(220,38,38,0.2)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)] disabled:grayscale disabled:opacity-50 transition-all flex justify-center items-center active:scale-95"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {ofertasLoading ? 'Procesando...' : 'Impactar Ofertas'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Settings Card */}
                <div className="md:col-span-1">
                    <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden group h-full">
                        <div className="absolute top-0 left-0 w-full h-1 bg-primary-500 shadow-[0_0_15px_rgba(255,184,0,0.5)]"></div>
                        <h2 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest">
                            <SettingsIcon className="w-5 h-5 text-primary-500 mr-3" />
                            Configuración
                        </h2>
                        
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5">
                                <div>
                                    <p className="text-sm font-bold text-gray-200">Visibilidad de Stock</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter mt-1">Controla si los clientes ven los círculos de stock</p>
                                </div>
                                <button 
                                    onClick={toggleStockVisibility}
                                    disabled={configLoading}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showStockConfig ? 'bg-primary-500' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showStockConfig ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-400 italic leading-relaxed">
                                Tip: Desactiva esta opción si estás importando archivos masivos para que los clientes no vean estados de stock inconsistentes durante el proceso.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

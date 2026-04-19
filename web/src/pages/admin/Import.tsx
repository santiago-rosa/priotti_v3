import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { Users, TrendingUp, Activity, Award, Tag, Plus, Trash2, Settings as SettingsIcon } from 'lucide-react';

interface Stats {
    orders30d: number;
    activeClients30d: number;
    totalClients: number;
    topClients: { nombre: string; total_pedidos: number }[];
}

interface GlobalDiscount {
    id: number;
    marca: string;
    rubro: string;
    porcentaje: number;
}

export const AdminImport = () => {
    const [status, setStatus] = useState<{ lista: string | null, cambios: string }>({ lista: null, cambios: '' });

    // Global App Config
    const [showStockConfig, setShowStockConfig] = useState<boolean>(true);
    const [configLoading, setConfigLoading] = useState(false);

    // Stats
    const [stats, setStats] = useState<Stats | null>(null);

    // Global Discounts
    const [brands, setBrands] = useState<string[]>([]);
    const [rubros, setRubros] = useState<string[]>([]);
    const [discounts, setDiscounts] = useState<GlobalDiscount[]>([]);
    const [newDiscount, setNewDiscount] = useState({ marca: '', rubro: '', porcentaje: '' });
    const [isSavingDiscount, setIsSavingDiscount] = useState(false);

    useEffect(() => {
        fetchStatus();
        fetchConfig();
        fetchStats();
        fetchDiscountsBase();
    }, []);

    useEffect(() => {
        if (newDiscount.marca) {
            fetchRubrosForBrand(newDiscount.marca);
        } else {
            setRubros([]);
        }
        setNewDiscount(prev => ({ ...prev, rubro: '' }));
    }, [newDiscount.marca]);

    const fetchDiscountsBase = async () => {
        try {
            const [bRes, dRes] = await Promise.all([
                api.get('/products/brands'),
                api.get('/discounts')
            ]);
            setBrands(bRes.data.data);
            setDiscounts(dRes.data.data);
        } catch (error) {
            console.error('Error fetching base discounts data');
        }
    };

    const fetchRubrosForBrand = async (marca: string) => {
        try {
            const { data } = await api.get(`/products/rubros?marca=${encodeURIComponent(marca)}`);
            setRubros(data.data);
        } catch (error) {
            console.error('Error fetching rubros for brand');
        }
    };

    const handleSaveDiscount = async () => {
        if (!newDiscount.marca || !newDiscount.rubro || !newDiscount.porcentaje) {
            alert('Por favor complete todos los campos');
            return;
        }
        setIsSavingDiscount(true);
        try {
            await api.post('/discounts', {
                marca: newDiscount.marca,
                rubro: newDiscount.rubro,
                porcentaje: parseFloat(newDiscount.porcentaje)
            });
            setNewDiscount({ marca: '', rubro: '', porcentaje: '' });
            await fetchDiscountsBase();
        } catch (error) {
            alert('Error al guardar el descuento');
        } finally {
            setIsSavingDiscount(false);
        }
    };

    const handleDeleteDiscount = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este descuento?')) return;
        try {
            await api.delete(`/discounts/${id}`);
            await fetchDiscountsBase();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

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

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-gray-200">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Sistema</h1>
                <p className="text-gray-500 mt-2 font-medium">Panel general de administración, estadísticas y actualizaciones del sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Status Card */}
                {status.cambios && (
                    <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 col-span-1 md:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                        <div className="bg-primary-500/10 text-primary-200 p-5 rounded-xl max-w-sm text-sm border border-primary-500/20 backdrop-blur-md">
                            <span className="font-black block mb-2 uppercase tracking-tighter text-primary-500">Últimos aumentos aplicados:</span>
                            <p className="font-medium">{status.cambios}</p>
                        </div>
                    </div>
                )}

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

                {/* Discounts Card */}
                <div className="md:col-span-1">
                    <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden group h-full">
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"></div>
                        <h2 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest">
                            <Tag className="w-5 h-5 text-amber-500 mr-3" />
                            Ofertas Globales
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                <select 
                                    value={newDiscount.marca}
                                    onChange={(e) => setNewDiscount(prev => ({ ...prev, marca: e.target.value }))}
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-amber-500 outline-none transition-colors"
                                >
                                    <option value="">Seleccionar Marca...</option>
                                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <select 
                                    value={newDiscount.rubro}
                                    onChange={(e) => setNewDiscount(prev => ({ ...prev, rubro: e.target.value }))}
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-amber-500 outline-none transition-colors"
                                >
                                    <option value="">Seleccionar Rubro...</option>
                                    {rubros.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <input 
                                        type="number"
                                        placeholder="% Dto"
                                        value={newDiscount.porcentaje}
                                        onChange={(e) => setNewDiscount(prev => ({ ...prev, porcentaje: e.target.value }))}
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-amber-500 outline-none transition-colors w-full"
                                    />
                                    <button 
                                        onClick={handleSaveDiscount}
                                        disabled={isSavingDiscount}
                                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-black p-2 rounded-xl transition-all"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {discounts.length === 0 ? (
                                    <p className="text-[10px] text-gray-500 italic text-center py-4">No hay descuentos globales configurados</p>
                                ) : (
                                    discounts.map(d => (
                                        <div key={d.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5 text-xs group/item">
                                            <div className="flex flex-col">
                                                <span className="font-black text-amber-500 uppercase tracking-tighter">{d.porcentaje}% OFF</span>
                                                <span className="text-gray-400 font-medium">{d.marca} › {d.rubro}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteDiscount(d.id)}
                                                className="text-gray-600 hover:text-red-500 p-2 transition-colors opacity-0 group-hover/item:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminImport;

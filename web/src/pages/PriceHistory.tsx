import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { History, Calendar, Tag, ChevronRight, Search } from 'lucide-react';

interface HistoryEntry {
    id: number;
    fecha: string;
    cambios: string;
}

export const PriceHistory = () => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await api.get('/price-history');
                setHistory(data);
            } catch (error) {
                console.error('Error fetching price history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filteredHistory = history.filter(entry => 
        entry.cambios.toLowerCase().includes(searchTerm.toLowerCase()) ||
        new Date(entry.fecha).toLocaleDateString('es-AR').includes(searchTerm)
    );

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center">
                        <History className="w-10 h-10 text-primary-500 mr-4" />
                        Historial de Cambios
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Marcas con actualización de precios en las últimas subidas.</p>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar marca o fecha..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-darker border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-600"
                    />
                </div>
            </div>

            <div className="bg-surface rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha de Actualización</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Marcas Incluidas</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-200">{formatDate(entry.fecha)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap gap-2">
                                                {entry.cambios.split(', ').slice(0, 8).map((marca, i) => (
                                                    <span key={i} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[10px] font-black text-gray-400 uppercase tracking-tighter hover:text-white transition-colors cursor-default">
                                                        {marca}
                                                    </span>
                                                ))}
                                                {entry.cambios.split(', ').length > 8 && (
                                                    <span className="px-2 py-1 bg-primary-500/10 text-primary-500 rounded text-[10px] font-black uppercase">
                                                        +{entry.cambios.split(', ').length - 8} más
                                                    </span>
                                                )}
                                                {entry.cambios === '' && <span className="text-gray-600 italic text-xs">Sin cambios en marcas</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="inline-flex items-center justify-center p-2 rounded-xl bg-white/5 text-gray-500 group-hover:text-primary-500 transition-all group-hover:bg-primary-500/10">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-8 py-12 text-center text-gray-500 italic">
                                        No se encontraron registros que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-primary-500/5 border border-primary-500/20 p-6 rounded-3xl flex items-start gap-4">
                <Tag className="w-6 h-6 text-primary-500 mt-1" />
                <div>
                    <h4 className="font-black uppercase text-[10px] tracking-widest text-primary-500 mb-1">Nota importante</h4>
                    <p className="text-sm text-gray-400 leading-relaxed font-medium">
                        Esta tabla muestra las marcas que han recibido actualizaciones de precio o stock en la última sincronización masiva. 
                        Si ves una marca en la lista, significa que alguno de sus artículos ha sido impactado por la nueva lista de precios.
                    </p>
                </div>
            </div>
        </div>
    );
};

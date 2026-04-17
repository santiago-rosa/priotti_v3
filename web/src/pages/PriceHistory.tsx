import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { History, Calendar, Tag, Search } from 'lucide-react';

interface HistoryEntry {
    id: number;
    fecha: string;
    cambios: string;
}

const BRANDS_PREVIEW = 8;

export const PriceHistory = () => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

    const toggleRow = (id: number) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
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
                    <h1 className="text-4xl font-black text-text-primary tracking-tighter uppercase flex items-center">
                        <History className="w-10 h-10 text-primary-500 mr-4" />
                        Historial de Cambios
                    </h1>
                    <p className="text-text-secondary mt-2 font-medium">Marcas con actualización de precios en las últimas subidas.</p>
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary group-focus-within:text-primary-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar marca o fecha..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-surface-darker border rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-text-secondary/50"
                    />
                </div>
            </div>

            <div className="bg-surface rounded-3xl border overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted border-b">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary w-48">Fecha de Actualización</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">Marcas Incluidas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map((entry) => {
                                    const brands = entry.cambios ? entry.cambios.split(', ') : [];
                                    const isExpanded = expandedRows.has(entry.id);
                                    const visibleBrands = isExpanded ? brands : brands.slice(0, BRANDS_PREVIEW);
                                    const hiddenCount = brands.length - BRANDS_PREVIEW;

                                    return (
                                        <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-bold text-text-primary">{formatDate(entry.fecha)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-wrap gap-2">
                                                    {visibleBrands.map((marca, i) => (
                                                        <span key={i} className="px-2 py-1 bg-muted border rounded text-[10px] font-black text-text-secondary uppercase tracking-tighter hover:text-text-primary transition-colors cursor-default">
                                                            {marca}
                                                        </span>
                                                    ))}

                                                    {brands.length === 0 && (
                                                        <span className="text-gray-600 italic text-xs">Sin cambios en marcas</span>
                                                    )}

                                                    {hiddenCount > 0 && !isExpanded && (
                                                        <button
                                                            onClick={() => toggleRow(entry.id)}
                                                            className="px-2 py-1 bg-primary-500/10 text-primary-500 rounded text-[10px] font-black uppercase hover:bg-primary-500/20 transition-colors cursor-pointer"
                                                        >
                                                            +{hiddenCount} más
                                                        </button>
                                                    )}

                                                    {isExpanded && brands.length > BRANDS_PREVIEW && (
                                                        <button
                                                            onClick={() => toggleRow(entry.id)}
                                                            className="px-2 py-1 bg-white/5 text-text-secondary rounded text-[10px] font-black uppercase hover:bg-white/10 hover:text-text-primary transition-colors cursor-pointer"
                                                        >
                                                            Ver menos
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={2} className="px-8 py-12 text-center text-gray-500 italic">
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
                    <p className="text-sm text-text-secondary leading-relaxed font-medium">
                        Esta tabla muestra las marcas que han recibido actualizaciones de precio o stock en la última sincronización masiva.
                        Si ves una marca en la lista, significa que alguno de sus artículos ha sido impactado por la nueva lista de precios.
                    </p>
                </div>
            </div>
        </div>
    );
};

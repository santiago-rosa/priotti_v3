import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/axios';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

export const AdminImport = () => {
    const [status, setStatus] = useState<{ lista: string | null, ofertas: string | null, cambios: string }>({ lista: null, ofertas: null, cambios: '' });

    // Ofertas Form
    const [ofertasFile, setOfertasFile] = useState<File | null>(null);
    const [ofertasLoading, setOfertasLoading] = useState(false);

    // Lista Form
    const [listaFiles, setListaFiles] = useState<File[]>([]);
    const [listaLoading, setListaLoading] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

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

    const handleListaSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (listaFiles.length < 3) return alert('Debe seleccionar aprecios.txt, alineasx.txt y arubrosx.txt');

        setListaLoading(true);
        const formData = new FormData();
        listaFiles.forEach(file => formData.append('files', file));

        try {
            const res = await api.post('/import/lista', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(`Lista actualizada. Nuevos: ${res.data.nuevos}, Actualizados: ${res.data.actualizados}`);
            setListaFiles([]);
            fetchStatus();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al actualizar lista');
        } finally {
            setListaLoading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Nunca';
        return new Date(dateStr).toLocaleString('es-AR');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-gray-200">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Actualizar Sistema</h1>
                <p className="text-gray-500 mt-2 font-medium">Sube los archivos de texto generados por el sistema de facturación para sincronizar el catálogo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Status Card */}
                <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 col-span-1 md:col-span-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h3 className="font-black text-white uppercase tracking-widest text-xs border-b border-white/5 pb-2 mb-4">Estado de sincronización</h3>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">Lista General: <span className="font-bold text-primary-500 ml-2">{formatDate(status.lista)}</span></p>
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

                {/* Ofertas Upload */}
                <div className="bg-surface p-8 rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"></div>
                    <h2 className="text-lg font-black text-white mb-6 flex items-center uppercase tracking-widest">
                        <TagIcon className="w-5 h-5 text-red-600 mr-3" />
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

                {/* Lista Upload */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-primary-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-primary-500"></div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <ListIcon className="w-5 h-5 text-primary-500 mr-2" />
                        Lista General
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">Sube los 3 archivos: <code className="bg-gray-100 px-1 py-0.5 rounded">aprecios.txt</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">arubrosx.txt</code> y <code className="bg-gray-100 px-1 py-0.5 rounded">alineasx.txt</code>.</p>

                    <form onSubmit={handleListaSubmit} className="space-y-4">
                        <div className={`border border-dashed rounded-lg p-4 text-center transition-colors ${listaFiles.length === 3 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}>
                            <input
                                type="file"
                                multiple
                                accept=".txt"
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                onChange={(e) => setListaFiles(Array.from(e.target.files || []))}
                            />
                            {listaFiles.length > 0 && (
                                <div className="mt-3 text-sm text-gray-600 flex items-center justify-center">
                                    {listaFiles.length === 3 ? <CheckCircle className="w-4 h-4 text-green-500 mr-1" /> : <AlertCircle className="w-4 h-4 text-orange-500 mr-1" />}
                                    {listaFiles.length} / 3 archivos seleccionados
                                </div>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={listaFiles.length < 3 || listaLoading}
                            className="w-full bg-primary-600 text-white rounded-lg py-2.5 font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {listaLoading ? 'Procesando...' : 'Actualizar Lista de Precios'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Quick Icons for the cards
const TagIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>;
const ListIcon = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;

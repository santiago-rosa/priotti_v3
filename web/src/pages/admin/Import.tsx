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
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Actualizar Sistema</h1>
                <p className="text-gray-600 mt-1">Sube los archivos de texto generados por el sistema de facturación para actualizar la base de datos de productos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-1 md:col-span-2 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-gray-800">Últimas actualizaciones</h3>
                        <p className="text-sm text-gray-600 mt-2">Lista General: <span className="font-medium text-gray-900">{formatDate(status.lista)}</span></p>
                        <p className="text-sm text-gray-600">Ofertas: <span className="font-medium text-gray-900">{formatDate(status.ofertas)}</span></p>
                    </div>
                    {status.cambios && (
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-md max-w-sm text-sm border border-blue-100">
                            <span className="font-semibold block mb-1">Últimos aumentos aplicados en:</span>
                            {status.cambios}
                        </div>
                    )}
                </div>

                {/* Ofertas Upload */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <TagIcon className="w-5 h-5 text-red-500 mr-2" />
                        Vigencia de Ofertas
                    </h2>
                    <p className="text-sm text-gray-600 mb-6">Sube el archivo <code className="bg-gray-100 px-1 py-0.5 rounded">ofertas.txt</code> para impactar los nuevos precios promocionales.</p>

                    <form onSubmit={handleOfertasSubmit} className="space-y-4">
                        <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                            <input
                                type="file"
                                accept=".txt"
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                onChange={(e) => setOfertasFile(e.target.files?.[0] || null)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!ofertasFile || ofertasLoading}
                            className="w-full bg-red-600 text-white rounded-lg py-2.5 font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex justify-center items-center"
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            {ofertasLoading ? 'Procesando...' : 'Actualizar Ofertas'}
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

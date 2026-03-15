import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { LogIn, AlertCircle } from 'lucide-react';
import logo from '../assets/logopriotti.png';

export const Login = () => {
    const [numero, setNumero] = useState('');
    const [cuit, setCuit] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { numero, cuit });
            const { token, role, user } = response.data;

            login(user, role, token);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <img src={logo} alt="Priotti Logo" className="h-32 w-auto mx-auto mb-6 brightness-110" />
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
                    FELIPE PRIOTTI <span className="text-primary-500">S.A.</span>
                </h2>
                <p className="mt-2 text-sm text-gray-500 font-medium">
                    Centro de Distribución Exclusivo
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-10 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/5 backdrop-blur-md">
                    {error && (
                        <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4">
                            <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="numero" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                Número de Cliente
                            </label>
                            <div className="mt-1">
                                <input
                                    id="numero"
                                    name="numero"
                                    type="text"
                                    required
                                    value={numero}
                                    onChange={(e) => setNumero(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl shadow-inner text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm"
                                    placeholder="Ej: 1234"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="cuit" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                Identificación / CUIT
                            </label>
                            <div className="mt-1">
                                <input
                                    id="cuit"
                                    name="cuit"
                                    type="password"
                                    required
                                    value={cuit}
                                    onChange={(e) => setCuit(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl shadow-inner text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-[0_5px_20px_rgba(255,184,0,0.2)] text-sm font-black text-black bg-primary-500 hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-600 disabled:text-gray-400 transition-all uppercase tracking-widest active:scale-95"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Iniciando sesión...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <LogIn className="w-5 h-5 mr-2" /> Ingresar
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

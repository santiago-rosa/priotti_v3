import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Download, Send, Phone, MapPin, Mail, User } from 'lucide-react';

export const Dashboard = () => {
    const { user, role } = useAuthStore();
    const [contactForm, setContactForm] = useState({ name: user?.nombre || '', phone: '', email: '', message: '' });
    const [sending, setSending] = useState(false);

    const handleDownloadExcel = async () => {
        try {
            const response = await api.get('/utils/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'listapriotti.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            alert('Error al descargar la lista');
        }
    };

    const handleContactSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.post('/utils/contact', contactForm);
            alert('Mensaje enviado correctamente! Nos pondremos en contacto a la brevedad.');
            setContactForm({ ...contactForm, message: '' });
        } catch (error) {
            alert('Hubo un error al enviar el mensaje.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-8 text-gray-200">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#1A1A1A] to-[#262626] rounded-2xl p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black mb-3 tracking-tighter">Hola, {user?.nombre}!</h1>
                    <p className="text-primary-500 text-xl font-medium">Bienvenido al nuevo panel de {role === 'admin' ? 'administración' : 'clientes'} de Priotti.</p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4">
                    <User className="w-96 h-96" />
                </div>
                <div className="absolute top-0 right-0 p-8">
                     <div className="w-24 h-1 bg-primary-500 rounded-full opacity-50"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Info & Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-surface p-8 rounded-2xl shadow-xl border border-white/5">
                        <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4">Acciones Rápidas</h2>
 
                        <div className="space-y-4">
                            {role === 'client' && (
                                <button
                                    onClick={handleDownloadExcel}
                                    className="w-full flex items-center justify-between p-5 rounded-xl bg-primary-500/5 hover:bg-primary-500/10 text-primary-500 transition-all border border-primary-500/20 group shadow-lg"
                                >
                                    <div className="flex items-center font-bold">
                                        <Download className="w-6 h-6 mr-4 text-primary-500 group-hover:bounce" />
                                        Descargar Lista de Precios
                                    </div>
                                    <span className="text-[10px] bg-primary-500 text-black px-2 py-1 rounded-md font-black uppercase tracking-tighter">Excel</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface p-8 rounded-2xl shadow-xl border border-white/5">
                        <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4">Contacto</h2>
                        <div className="space-y-6 text-gray-400">
                            <div className="flex items-start group">
                                <div className="p-3 bg-white/5 rounded-xl mr-4 group-hover:bg-primary-500/10 transition-colors">
                                    <MapPin className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-200 uppercase text-xs tracking-widest mb-1">Ubicación</p>
                                    <p className="text-gray-400">Villa Luro, CABA</p>
                                </div>
                            </div>
                            <div className="flex items-start group">
                                <div className="p-3 bg-white/5 rounded-xl mr-4 group-hover:bg-primary-500/10 transition-colors">
                                    <Phone className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-200 uppercase text-xs tracking-widest mb-1">WhatsApp</p>
                                    <p className="text-gray-400">11 5012-7061 / 11 6813-2613</p>
                                </div>
                            </div>
                            <div className="flex items-start group">
                                <div className="p-3 bg-white/5 rounded-xl mr-4 group-hover:bg-primary-500/10 transition-colors">
                                    <Mail className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-200 uppercase text-xs tracking-widest mb-1">Email Oficial</p>
                                    <p className="text-gray-400">consultas@priotti.com.ar</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-surface p-8 rounded-2xl shadow-xl border border-white/5">
                    <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4">Consulta Directa</h2>
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Nombre / Empresa</label>
                            <input
                                type="text" required
                                className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                value={contactForm.name}
                                onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Teléfono</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                    value={contactForm.phone}
                                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Email</label>
                                <input
                                    type="email" required
                                    className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                    value={contactForm.email}
                                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Mensaje o Detalle</label>
                            <textarea
                                required rows={4}
                                className="w-full px-4 py-3 bg-[#121212] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all resize-none"
                                value={contactForm.message}
                                onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                            ></textarea>
                        </div>
                        <button
                            type="submit" disabled={sending}
                            className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-[0_5px_20px_rgba(255,184,0,0.2)] text-black font-black bg-primary-500 hover:bg-primary-400 focus:outline-none transition-all uppercase tracking-[0.2em] text-xs active:scale-95 disabled:bg-gray-700"
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {sending ? 'Enviando...' : 'Enviar Mensaje'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Send, Phone, MapPin, Mail, User } from 'lucide-react';

export const Contact = () => {
    const { user, role } = useAuthStore();
    const [contactForm, setContactForm] = useState({ name: user?.nombre || '', phone: '', email: '', message: '' });
    const [sending, setSending] = useState(false);

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

    if (role === 'admin') {
        return (
            <div className="text-center py-20 text-text-secondary font-medium uppercase tracking-widest text-xs">
                La sección de contacto no está disponible para administradores.
            </div>
        );
    }

    return (
        <div className="space-y-8 text-text-primary pb-20 max-w-6xl mx-auto">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-surface to-surface-light rounded-2xl p-10 text-text-primary shadow-2xl relative overflow-hidden border">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black mb-3 tracking-tighter">¿Necesitás ayuda?</h1>
                    <p className="text-primary-500 text-xl font-medium">Estamos para asesorarte en lo que necesites.</p>
                </div>
                <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-1/4 translate-y-1/4">
                    <User className="w-96 h-96" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Info */}
                <div className="space-y-6">
                    <div className="bg-surface p-8 rounded-2xl shadow-xl border border-white/5">
                        <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4 text-primary-500">Información de Contacto</h2>
                        <div className="space-y-8 text-text-secondary">
                            <div className="flex items-start group">
                                <div className="p-4 bg-white/5 rounded-2xl mr-5 group-hover:bg-primary-500/10 transition-all border border-white/5">
                                    <MapPin className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-200 uppercase text-xs tracking-widest mb-1.5 pt-1">Ubicación</p>
                                    <p className="text-text-secondary text-lg">Lavalleja 1430, Cordoba Capital, Cordoba</p>
                                </div>
                            </div>
                            <div className="flex items-start group">
                                <div className="p-4 bg-white/5 rounded-2xl mr-5 group-hover:bg-primary-500/10 transition-all border border-white/5">
                                    <Phone className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-200 uppercase text-xs tracking-widest mb-1.5 pt-1">WhatsApp</p>
                                    <p className="text-text-secondary text-lg font-mono">+54 351 392-1731</p>
                                </div>
                            </div>
                            <div className="flex items-start group">
                                <div className="p-4 bg-white/5 rounded-2xl mr-5 group-hover:bg-primary-500/10 transition-all border border-white/5">
                                    <Mail className="w-6 h-6 text-primary-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-200 uppercase text-xs tracking-widest mb-1.5 pt-1">Email Oficial</p>
                                    <p className="text-text-secondary text-lg text-primary-500">fpriotti@felipepriotti.com.ar</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-surface p-8 rounded-2xl shadow-xl border">
                    <h2 className="text-xl font-black text-text-primary mb-6 uppercase tracking-widest border-b pb-4 text-primary-500">Consulta Directa</h2>
                    <form onSubmit={handleContactSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2.5">Nombre / Empresa</label>
                            <input
                                type="text" required
                                className="w-full px-4 py-4 bg-surface-darker border rounded-xl text-text-primary focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                value={contactForm.name}
                                onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2.5">Teléfono</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-4 bg-surface-darker border rounded-xl text-text-primary focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                    value={contactForm.phone}
                                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2.5">Email</label>
                                <input
                                    type="email" required
                                    className="w-full px-4 py-4 bg-surface-darker border rounded-xl text-text-primary focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                    value={contactForm.email}
                                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-2.5">Mensaje o Detalle</label>
                            <textarea
                                required rows={5}
                                className="w-full px-4 py-4 bg-surface-darker border rounded-xl text-text-primary focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all resize-none"
                                value={contactForm.message}
                                onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                            ></textarea>
                        </div>
                        <button
                            type="submit" disabled={sending}
                            className="w-full flex justify-center items-center py-5 px-6 border border-transparent rounded-xl shadow-[0_5px_20px_rgba(255,184,0,0.2)] text-black font-black bg-primary-500 hover:bg-primary-400 focus:outline-none transition-all uppercase tracking-[0.2em] text-xs active:scale-95 disabled:bg-gray-700"
                        >
                            <Send className="w-4 h-4 mr-2.5" />
                            {sending ? 'Enviando...' : 'Enviar Mensaje'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

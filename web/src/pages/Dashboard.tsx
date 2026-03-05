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
        <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="bg-primary-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">Hola, {user?.nombre}!</h1>
                    <p className="text-primary-100 text-lg">Bienvenido al nuevo panel de {role === 'admin' ? 'administración' : 'clientes'} de Priotti.</p>
                </div>
                <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <User className="w-64 h-64" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Info & Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>

                        <div className="space-y-4">
                            {role === 'client' && (
                                <button
                                    onClick={handleDownloadExcel}
                                    className="w-full flex items-center justify-between p-4 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors border border-green-200 group"
                                >
                                    <div className="flex items-center font-medium">
                                        <Download className="w-5 h-5 mr-3 text-green-600" />
                                        Descargar Lista de Precios
                                    </div>
                                    <span className="text-sm bg-green-200 text-green-800 px-2 py-1 rounded hidden sm:block group-hover:bg-green-300 transition-colors">Excel (.xlsx)</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Información de Contacto</h2>
                        <div className="space-y-4 text-gray-600">
                            <div className="flex items-start">
                                <MapPin className="w-5 h-5 mr-3 text-primary-500 mt-1" />
                                <div>
                                    <p className="font-medium text-gray-900">Ubicación</p>
                                    <p>Villa Luro, CABA</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Phone className="w-5 h-5 mr-3 text-primary-500 mt-1" />
                                <div>
                                    <p className="font-medium text-gray-900">Teléfonos / WhatsApp</p>
                                    <p>11 5012-7061</p>
                                    <p>11 6813-2613</p>
                                    <p>11 2513-4638</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <Mail className="w-5 h-5 mr-3 text-primary-500 mt-1" />
                                <div>
                                    <p className="font-medium text-gray-900">Email</p>
                                    <p>consultas@priotti.com.ar</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Envíanos tu consulta</h2>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Empresa</label>
                            <input
                                type="text" required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                value={contactForm.name}
                                onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="text" required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    value={contactForm.phone}
                                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email" required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    value={contactForm.email}
                                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                            <textarea
                                required rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                value={contactForm.message}
                                onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                            ></textarea>
                        </div>
                        <button
                            type="submit" disabled={sending}
                            className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-colors"
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

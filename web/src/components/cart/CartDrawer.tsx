import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/axios';
import { formatPrice } from '../../lib/utils';
import { useState } from 'react';

export const CartDrawer = () => {
    const { isOpen, setIsOpen, items, total, removeItem, updateQuantity, clearCart } = useCartStore();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const { user } = useAuthStore();

    if (!isOpen) return null;

    const handleEmailCheckout = async () => {
        if (!confirm('¿Desea confirmar el pedido por Email? Se enviará una copia al administrador.')) return;
        setIsCheckingOut(true);
        try {
            // Save cart items and close order via backend (triggers email)
            await api.post('/orders/cart', { items });
            await api.post('/orders/checkout');

            alert('¡Pedido enviado por Email correctamente!');
            clearCart();
            setIsOpen(false);
        } catch (error) {
            alert('Error al procesar el pedido por email.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleWhatsAppCheckout = async () => {
        setIsCheckingOut(true);
        try {
            // Save the cart to DB before opening WA so we have a record
            await api.post('/orders/cart', { items });

            const phone = import.meta.env.VITE_WHATSAPP_PHONE || '543513921731';
            
            let message = `*NUEVO PEDIDO - FELIPE PRIOTTI S.A.*\n\n`;
            message += `*Cliente:* ${user?.nombre} (${user?.numero || 'S/D'})\n`;
            message += `*Detalle:*\n`;
            
            items.forEach(item => {
                message += `- ${item.cantidad}x ${item.aplicacion} [${item.codigo}] ($${formatPrice(item.precio)})\n`;
            });
            
            message += `\n*TOTAL: $${formatPrice(total)}*\n\n`;
            message += `_Enviado desde el catálogo digital._`;

            const encodedMessage = encodeURIComponent(message);
            window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
            
            alert('Pedido enviado a WhatsApp! Recuerde presionar "Enviar" en su aplicación.');
            clearCart();
            setIsOpen(false);
        } catch (error) {
            alert('Hubo un error al preparar el mensaje de WhatsApp.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            <div className="fixed inset-y-0 right-0 max-w-md w-full bg-[#1A1A1A] shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 transform flex flex-col border-l border-white/5 transition-all duration-300">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-xl font-black flex items-center text-white tracking-widest uppercase">
                        <ShoppingBag className="mr-3 text-primary-500" />
                        Mi Pedido
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-20">
                            <ShoppingBag className="mx-auto h-16 w-16 text-[#2a2a2a] mb-6" />
                            <p className="text-gray-500 font-medium">El carrito está vacío.</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.codigo} className="flex flex-col border border-white/5 rounded-2xl p-4 shadow-xl bg-[#262626]/50 relative group hover:bg-[#262626] transition-colors">
                                <button
                                    onClick={() => removeItem(item.codigo)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <h3 className="font-bold text-sm text-gray-100 pr-6 leading-tight group-hover:text-primary-500 transition-colors uppercase tracking-tight">{item.aplicacion}</h3>
                                <p className="text-[10px] text-gray-500 mt-1.5 font-bold tracking-widest">REF: {item.codigo} <span className="mx-1 opacity-30">|</span> MARCA: {item.marca}</p>

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex items-center border border-white/5 rounded-xl overflow-hidden bg-[#121212]">
                                        <button
                                            onClick={() => updateQuantity(item.codigo, Math.max(1, item.cantidad - 1))}
                                            className="px-3 py-2 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="px-4 text-sm font-black text-white w-12 text-center">{item.cantidad}</span>
                                        <button
                                            onClick={() => updateQuantity(item.codigo, item.cantidad + 1)}
                                            className="px-3 py-2 hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <div className="font-black text-primary-500 tracking-tighter text-lg">
                                        ${formatPrice(item.precio * item.cantidad)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t border-white/5 p-6 bg-[#1A1A1A]/80 backdrop-blur-md">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total del Pedido</span>
                        <span className="text-2xl font-black text-primary-500 tracking-tighter">${formatPrice(total)}</span>
                    </div>
 
                    <div className="grid grid-cols-1 gap-3">
                        <button
                            disabled={items.length === 0 || isCheckingOut}
                            onClick={handleWhatsAppCheckout}
                            className="w-full bg-[#25D366] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_5px_15px_rgba(37,211,102,0.2)] hover:shadow-[0_8px_25px_rgba(37,211,102,0.4)] transition-all hover:-translate-y-1 active:scale-95 disabled:grayscale disabled:opacity-50 disabled:translate-y-0"
                        >
                            Confirmar por WhatsApp
                        </button>
                        
                        <button
                            disabled={items.length === 0 || isCheckingOut}
                            onClick={handleEmailCheckout}
                            className="w-full bg-primary-500 text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_5px_15px_rgba(255,184,0,0.2)] hover:shadow-[0_8px_25px_rgba(255,184,0,0.4)] transition-all hover:-translate-y-1 active:scale-95 disabled:grayscale disabled:opacity-50 disabled:translate-y-0"
                        >
                            {isCheckingOut ? 'Enviando...' : 'Confirmar por Email'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

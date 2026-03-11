import { useCartStore } from '../../store/cartStore';
import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/axios';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

export const CartDrawer = () => {
    const { user } = useAuthStore();
    const { isOpen, setIsOpen, items, total, removeItem, updateQuantity, clearCart } = useCartStore();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    if (!isOpen) return null;

    const handleEmailCheckout = async () => {
        setIsCheckingOut(true);
        try {
            // Save cart items and close order via backend (triggers email)
            await api.post('/orders/cart', { items });
            await api.post('/orders/checkout');

            alert('Pedido enviado por email correctamente!');
            clearCart();
            setIsOpen(false);
        } catch (error) {
            alert('Hubo un error al procesar el pedido por email.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleWhatsAppCheckout = async () => {
        setIsCheckingOut(true);
        try {
            // Optional: Save the cart to DB before opening WA so you have a record
            await api.post('/orders/cart', { items });

            const adminPhone = import.meta.env.VITE_WHATSAPP_PHONE || '543517319531';

            const message = encodeURIComponent(
                `📦 *Nuevo Pedido Priotti*\n\n` +
                `👤 *Cliente:* ${user?.id} - ${user?.nombre}\n\n` +
                `🛒 *Artículos:*\n` +
                items.map(item => `- ${item.codigo} (${item.marca}): *${item.cantidad}*`).join('\n') +
                `\n\n💰 *Total:* $${total.toFixed(2)}`
            );

            window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');

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

            <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 transform flex flex-col transition-transform duration-300">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold flex items-center">
                        <ShoppingBag className="mr-2" />
                        Mi Pedido
                    </h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            <ShoppingBag className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <p>El carrito está vacío.</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.codigo} className="flex flex-col border rounded-lg p-3 shadow-sm bg-gray-50 relative group">
                                <button
                                    onClick={() => removeItem(item.codigo)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <h3 className="font-semibold text-sm pr-6 leading-tight">{item.aplicacion}</h3>
                                <p className="text-xs text-gray-500 mt-1">Ref: {item.codigo} | Marca: {item.marca}</p>

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center border rounded-md overflow-hidden bg-white">
                                        <button
                                            onClick={() => updateQuantity(item.codigo, Math.max(1, item.cantidad - 1))}
                                            className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="px-3 text-sm font-medium w-10 text-center">{item.cantidad}</span>
                                        <button
                                            onClick={() => updateQuantity(item.codigo, item.cantidad + 1)}
                                            className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <div className="font-bold text-primary-600">
                                        ${(item.precio * item.cantidad).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4 text-lg font-bold">
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                        <button
                            disabled={items.length === 0 || isCheckingOut}
                            onClick={handleEmailCheckout}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            Confirmar por Email
                        </button>

                        <button
                            disabled={items.length === 0 || isCheckingOut}
                            onClick={handleWhatsAppCheckout}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            Confirmar por WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

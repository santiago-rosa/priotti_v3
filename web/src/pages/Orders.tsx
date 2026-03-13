import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import { useState, useEffect } from 'react';
import { History, ChevronDown } from 'lucide-react';

interface OrderItem {
    codigo: string;
    marca: string;
    cantidad: number;
}

interface Order {
    idpedidos: number;
    fechapedido: string;
    items: OrderItem[];
    estado: string;
}

export const Orders = () => {
    const { role } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.get('/orders');
                setOrders(response.data.data);
            } catch (error) {
                console.error('Error fetching orders', error);
            } finally {
                setLoading(false);
            }
        };
        if (role === 'client') fetchOrders();
        else setLoading(false);
    }, [role]);

    if (role !== 'client') {
        return (
            <div className="text-center py-20 text-gray-500">
                Esta sección es solo para clientes.
            </div>
        );
    }

    return (
        <div className="space-y-8 text-gray-200 pb-20 max-w-4xl mx-auto">
            <div className="bg-surface p-8 rounded-2xl shadow-xl border border-white/5">
                <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-4 flex items-center">
                    <History className="mr-3 text-primary-500" />
                    Mis Pedidos
                </h2>
                
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 font-medium">
                        No tienes pedidos anteriores.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => (
                            <div key={order.idpedidos} className="border border-white/5 rounded-xl overflow-hidden bg-[#1A1A1A] hover:border-primary-500/30 transition-colors">
                                <button
                                    onClick={() => setExpandedOrder(expandedOrder === order.idpedidos ? null : order.idpedidos)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-8 text-left">
                                        <div className="flex items-center">
                                            <span className="text-[10px] font-black bg-primary-500 text-black px-2 py-1 rounded truncate mr-3">
                                                #{order.idpedidos}
                                            </span>
                                            <span className="text-sm font-bold text-gray-300">
                                                {new Date(order.fechapedido).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                {order.items.length} Artículos
                                            </span>
                                            <span className="text-[10px] font-black text-primary-500/80 uppercase tracking-widest">
                                                {new Date(order.fechapedido).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ${expandedOrder === order.idpedidos ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedOrder === order.idpedidos && (
                                    <div className="p-5 bg-black/20 border-t border-white/5 space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-white/5 last:border-0">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-200">{item.codigo}</span>
                                                    <span className="text-xs text-gray-500 uppercase tracking-widest">{item.marca}</span>
                                                </div>
                                                <div className="bg-primary-500/10 text-primary-500 px-3 py-1 rounded-lg font-black text-xs">
                                                    {item.cantidad} un.
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

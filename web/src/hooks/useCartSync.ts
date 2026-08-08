import { useCallback } from 'react';
import { useCartStore } from '../store/cartStore';
import type { CartItem } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';

export const useCartSync = () => {
    const { loadCart } = useCartStore();
    const { user, role } = useAuthStore();

    const syncFromDB = useCallback(async () => {
        if (!user || role !== 'client') return;
        try {
            const cartRes = await api.get('/orders/cart');
            const dbItems = cartRes.data.items || [];

            if (dbItems.length === 0) {
                loadCart([]);
                return;
            }

            const codigos = dbItems.map((i: any) => i.codigo);
            const productsRes = await api.post('/products/list', { codigos });
            const products = productsRes.data.data;

            const hydratedItems: CartItem[] = dbItems.map((dbItem: any) => {
                const p = products.find((prod: any) => prod.codigo === dbItem.codigo);
                if (!p) return null;
                const precio = p.precio_oferta > 0 ? p.precio_oferta : p.precio_lista;
                return {
                    codigo: p.codigo,
                    marca: p.marca,
                    rubro: p.rubro,
                    aplicacion: p.aplicacion?.replace(/=/g, 'IDEM ') || '',
                    precio: parseFloat(precio.toFixed(2)),
                    cantidad: dbItem.cantidad,
                    imagen: p.codigo
                };
            }).filter(Boolean) as CartItem[];

            loadCart(hydratedItems);
        } catch (error) {
            console.error('Error syncing cart from DB', error);
        }
    }, [user, role, loadCart]);

    return { syncFromDB };
};

import { useEffect, useRef } from 'react';
import { useCartStore } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/axios';

export const CartSync = () => {
    const { items, loadCart } = useCartStore();
    const { user, role } = useAuthStore();
    const isFirstRun = useRef(true);
    const syncTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

    // 1. Initial Load from DB on Login/Mount
    useEffect(() => {
        const syncFromDB = async () => {
            if (!user || role !== 'client') return;
            
            try {
                const cartRes = await api.get('/orders/cart');
                const dbItems = cartRes.data.items || [];
                
                if (dbItems.length > 0) {
                    // Fetch full product details to re-hydrate if local cart is empty
                    // or if we want to ensure we have the latest prices/names
                    const codigos = dbItems.map((i: any) => i.codigo);
                    const productsRes = await api.post('/products/list', { codigos });
                    const products = productsRes.data.data;

                    const coeficiente = user.coeficiente || 1;
                    
                    const hydratedItems: CartItem[] = dbItems.map((dbItem: any) => {
                        const p = products.find((prod: any) => prod.codigo === dbItem.codigo);
                        if (!p) return null;

                        const precio = p.precio_oferta > 0 ? p.precio_oferta : p.precio_lista * coeficiente;
                        
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

                    if (hydratedItems.length > 0) {
                        loadCart(hydratedItems);
                    }
                }
            } catch (error) {
                console.error('Error syncing cart from DB', error);
            }
        };

        if (user && role === 'client' && items.length === 0) {
            syncFromDB();
        }
    }, [user, role, items.length, loadCart]); // Run when user logs in or cart is empty

    // 2. Sync to DB on change (Debounced)
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        if (!user || role !== 'client') return;

        if (syncTimeout.current) clearTimeout(syncTimeout.current);

        syncTimeout.current = setTimeout(async () => {
            try {
                await api.post('/orders/cart', { items });
            } catch (error) {
                console.error('Error syncing cart to DB', error);
            }
        }, 2000); // 2 second debounce

        return () => {
            if (syncTimeout.current) clearTimeout(syncTimeout.current);
        };
    }, [items, user, role]);

    return null; // Side-effect only component
};

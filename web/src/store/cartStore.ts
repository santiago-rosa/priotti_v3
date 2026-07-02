import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    codigo: string;
    marca: string;
    rubro: string;
    aplicacion: string;
    precio: number;
    cantidad: number;
    imagen: string;
}

interface CartState {
    items: CartItem[];
    userId: number | null;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    addItem: (item: CartItem) => void;
    removeItem: (codigo: string) => void;
    updateQuantity: (codigo: string, cantidad: number) => void;
    clearCart: () => void;
    setUserId: (userId: number | null) => void;
    total: number;
    loadCart: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            userId: null,
            isOpen: false,
            total: 0,
            setIsOpen: (isOpen) => set({ isOpen }),
            addItem: (item) => {
                const currentItems = [...get().items];
                const existingIndex = currentItems.findIndex(i => i.codigo === item.codigo);

                if (existingIndex >= 0) {
                    currentItems[existingIndex] = {
                        ...currentItems[existingIndex],
                        cantidad: currentItems[existingIndex].cantidad + item.cantidad,
                    };
                    const total = currentItems.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
                    set({ items: currentItems, total });
                    return;
                }

                const newItems = [...currentItems, item];
                const total = newItems.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
                set({ items: newItems, total });
            },
            removeItem: (codigo) => {
                const newItems = get().items.filter(i => i.codigo !== codigo);
                const total = newItems.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
                set({ items: newItems, total });
            },
            updateQuantity: (codigo, cantidad) => {
                const newItems = get().items.map(i => i.codigo === codigo ? { ...i, cantidad } : i);
                const total = newItems.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
                set({ items: newItems, total });
            },
            clearCart: () => set({ items: [], total: 0, userId: null }),
            setUserId: (userId) => set({ userId }),
            loadCart: (items) => {
                const total = items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
                set({ items, total });
            },
        }),
        {
            name: 'priotti-cart-storage',
        }
    )
);

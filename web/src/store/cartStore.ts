import { create } from 'zustand';

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
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    addItem: (item: CartItem) => void;
    removeItem: (codigo: string) => void;
    updateQuantity: (codigo: string, cantidad: number) => void;
    clearCart: () => void;
    total: number;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    isOpen: false,
    total: 0,
    setIsOpen: (isOpen) => set({ isOpen }),
    addItem: (item) => {
        const existing = get().items.find(i => i.codigo === item.codigo);
        if (existing) {
            get().updateQuantity(item.codigo, existing.cantidad + item.cantidad);
        } else {
            const newItems = [...get().items, item];
            const total = newItems.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
            set({ items: newItems, total });
        }
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
    clearCart: () => set({ items: [], total: 0 })
}));

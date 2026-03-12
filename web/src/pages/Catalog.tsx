import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Search, Filter, ShoppingCart, Tag, Clock } from 'lucide-react';

interface Product {
    codigo: string;
    marca: string;
    rubro: string;
    aplicacion: string;
    precio_lista: number;
    precio_oferta: number;
    imagen: string;
}

export const Catalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'offers' | 'news'>('all');
    const [loading, setLoading] = useState(false);

    const { role, user } = useAuthStore();
    const addItem = useCartStore((state) => state.addItem);

    const coeficiente = user?.coeficiente || 1;

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (search) params.append('search', search);
                if (filter !== 'all') params.append('filter', filter);

                const response = await api.get(`/products?${params.toString()}`);
                setProducts(response.data.data);
            } catch (error) {
                console.error('Error fetching products', error);
            } finally {
                setLoading(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchProducts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, filter]);

    const handleAddToCart = (product: Product, quantity = 1) => {
        const precio = product.precio_oferta > 0 ? product.precio_oferta : product.precio_lista * coeficiente;
        addItem({
            codigo: product.codigo,
            marca: product.marca,
            rubro: product.rubro,
            aplicacion: product.aplicacion,
            precio: parseFloat(precio.toFixed(2)),
            cantidad: quantity,
            imagen: product.imagen
        });
    };

    return (
        <div className="space-y-6 text-gray-200">
            {/* Header and Controls */}
            <div className="bg-[#1A1A1A]/80 p-6 rounded-2xl shadow-2xl border border-white/5 flex flex-col md:flex-row gap-6 justify-between items-center backdrop-blur-xl sticky top-[72px] z-30">
                <div className="relative w-full md:w-1/2 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-12 pr-4 py-3.5 bg-[#0F0F0F] border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm transition-all text-white placeholder-gray-600 outline-none shadow-inner"
                        placeholder="¿Qué estás buscando? (código, marca, rubro...)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex space-x-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all ${filter === 'all' ? 'bg-primary-500 text-black shadow-[0_5px_15px_rgba(255,184,0,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('offers')}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all ${filter === 'offers' ? 'bg-red-500 text-white shadow-[0_5px_15px_rgba(239,68,68,0.3)]' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'}`}
                    >
                        <Tag className="w-4 h-4 mr-2" />
                        Ofertas
                    </button>
                    <button
                        onClick={() => setFilter('news')}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all ${filter === 'news' ? 'bg-green-500 text-white shadow-[0_5px_15px_rgba(34,197,94,0.3)]' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20'}`}
                    >
                        <Clock className="w-4 h-4 mr-2" />
                        Novedades
                    </button>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-surface p-12 text-center rounded-xl border border-dashed border-white/10">
                    <Search className="mx-auto h-12 w-12 text-gray-700 mb-4" />
                    <h3 className="text-lg font-medium text-gray-300">No se encontraron productos</h3>
                    <p className="mt-1 text-gray-500">Intente ajustar los términos de búsqueda o filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => {
                        const isOffer = product.precio_oferta > 0;
                        const finalPrice = isOffer ? product.precio_oferta : product.precio_lista * coeficiente;
                        const displayApp = product.aplicacion?.replace(/=/g, 'IDEM ') || '';

                        return (
                            <div key={product.codigo} className="bg-[#1A1A1A] rounded-2xl shadow-xl border border-white/5 hover:border-primary-500/50 transition-all duration-300 overflow-hidden flex flex-col relative group hover:-translate-y-1">
                                {isOffer && (
                                    <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg z-20 shadow-lg flex items-center uppercase tracking-widest">
                                        <Tag className="w-2 h-2 mr-1" /> OFERTA
                                    </div>
                                )}
                                
                                {/* Product Image Container */}
                                <div className="w-full h-48 bg-[#121212] flex items-center justify-center group-hover:bg-[#0A0A0A] transition-colors relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <img
                                        src={`/images/products/${product.codigo}.png`}
                                        alt={product.aplicacion || product.codigo}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 z-10"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            if (!target.src.includes('default.png')) {
                                                target.src = '/images/products/default.png';
                                            }
                                        }}
                                    />
                                </div>

                                <div className="p-5 flex-grow">
                                    <div className="text-[10px] font-black tracking-[0.2em] text-primary-500/60 mb-2 uppercase">{product.marca}</div>
                                    <h3 className="text-sm font-bold text-gray-100 mb-4 leading-snug group-hover:text-primary-500 transition-colors line-clamp-2 min-h-[2.5rem] tracking-tight">{displayApp}</h3>
                                    
                                    <div className="space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-gray-500 tracking-widest">CÓDIGO</span>
                                            <span className="font-black text-gray-200 tabular-nums bg-white/5 px-1.5 py-0.5 rounded tracking-widest">{product.codigo}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-gray-500 tracking-widest">RUBRO</span>
                                            <span className="font-bold text-gray-300 truncate ml-4 max-w-[120px] uppercase">{product.rubro}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 pb-5 pt-0 mt-auto flex items-end justify-between">
                                    <div className="flex flex-col">
                                        {isOffer && (
                                            <span className="text-[10px] line-through text-gray-600 font-bold tracking-tight mb-0.5">
                                                ${(product.precio_lista * coeficiente).toFixed(2)}
                                            </span>
                                        )}
                                        <div className="flex items-baseline">
                                            <span className="text-xs font-black text-primary-500/80 mr-1">$</span>
                                            <span className={`text-2xl font-black tracking-tighter ${isOffer ? 'text-red-500' : 'text-primary-500'}`}>
                                                {finalPrice.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {role === 'client' && (
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="bg-primary-500 hover:bg-primary-400 text-black p-3 rounded-xl shadow-[0_5px_15px_rgba(255,184,0,0.2)] hover:shadow-[0_8px_25px_rgba(255,184,0,0.4)] transition-all hover:-translate-y-1 active:scale-95 group/btn"
                                            aria-label="Agregar al carrito"
                                        >
                                            <ShoppingCart className="w-5 h-5 stroke-[2.5] group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

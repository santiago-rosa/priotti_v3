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
        <div className="space-y-6">
            {/* Header and Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-1/2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm transition-shadow"
                        placeholder="Buscar por código, marca, rubro o descripción..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex space-x-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center transition-colors ${filter === 'all' ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('offers')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center transition-colors ${filter === 'offers' ? 'bg-red-500 text-white shadow-md' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                    >
                        <Tag className="w-4 h-4 mr-2" />
                        Ofertas
                    </button>
                    <button
                        onClick={() => setFilter('news')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex items-center transition-colors ${filter === 'news' ? 'bg-green-500 text-white shadow-md' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
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
                <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
                    <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No se encontraron productos</h3>
                    <p className="mt-1 text-gray-500">Intente ajustar los términos de búsqueda o filtros.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => {
                        const isOffer = product.precio_oferta > 0;
                        const finalPrice = isOffer ? product.precio_oferta : product.precio_lista * coeficiente;
                        // The existing PHP code checks for 'IDEM ' replacements etc, the backend handles it.
                        // But we send the raw one, we replace here if needed.
                        const displayApp = product.aplicacion?.replace(/=/g, 'IDEM ') || '';

                        return (
                            <div key={product.codigo} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col relative group">
                                {isOffer && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10 shadow-sm flex items-center">
                                        <Tag className="w-3 h-3 mr-1" /> OFERTA
                                    </div>
                                )}

                                <div className="p-5 flex-grow">
                                    <div className="text-xs font-semibold tracking-wider text-gray-500 mb-1 uppercase">{product.marca}</div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-2 leading-tight pr-8">{displayApp}</h3>

                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4 bg-gray-50 p-2 rounded-md">
                                        <div><span className="font-semibold block">CÓDIGO</span> {product.codigo}</div>
                                        <div><span className="font-semibold block">RUBRO</span> {product.rubro}</div>
                                    </div>
                                </div>

                                <div className="p-5 pt-0 mt-auto border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        {isOffer && <span className="text-xs line-through text-gray-400 font-medium">${(product.precio_lista * coeficiente).toFixed(2)}</span>}
                                        <span className={`text-xl font-extrabold ${isOffer ? 'text-red-600' : 'text-primary-700'}`}>
                                            ${finalPrice.toFixed(2)}
                                        </span>
                                    </div>

                                    {role === 'client' && (
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-sm hover:shadow transition-all group-hover:scale-105 active:scale-95"
                                            aria-label="Agregar al carrito"
                                        >
                                            <ShoppingCart className="w-5 h-5" />
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

import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { formatPrice } from '../lib/utils';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Search, Filter, ShoppingCart, Tag, Clock, Edit2, Edit3, Settings, Download, Info, LayoutGrid, List, X } from 'lucide-react';

interface Product {
    codigo: string;
    marca: string;
    rubro: string;
    aplicacion: string;
    precio_lista: number;
    precio_oferta: number;
    imagen: string;
    stock: number;
    stock_low: number;
    stock_medium: number;
    stock_status: 'red' | 'yellow' | 'green' | null;
    info?: string;
}

export const Catalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'offers' | 'news'>('all');
    const [loading, setLoading] = useState(false);
    const [selectedInfoProduct, setSelectedInfoProduct] = useState<Product | null>(null);
    const [editingProductInfo, setEditingProductInfo] = useState<Product | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [tempInfo, setTempInfo] = useState('');

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

    const handleBulkUpdateThresholds = async () => {
        try {
            const brandsRes = await api.get('/products/brands');
            const brands = brandsRes.data.data;
            
            const brandStr = brands.join(', ');
            const marca = prompt(`Marcas disponibles:\n${brandStr}\n\nIngrese la marca para actualizar en bloque:`);
            if (!marca || !brands.includes(marca)) {
                if (marca) alert('Marca no válida');
                return;
            }

            const thresholds = prompt(`Marca seleccionada: ${marca}\nIngrese nuevos umbrales (rojo, amarillo):`, '5, 15');
            if (!thresholds) return;

            const [low, medium] = thresholds.split(',').map(v => parseInt(v.trim()));
            if (isNaN(low) || isNaN(medium)) {
                alert('Valores inválidos');
                return;
            }

            await api.put('/products/bulk/thresholds', {
                marca,
                stock_low: low,
                stock_medium: medium
            });

            alert(`Umbrales actualizados para ${marca}`);
            
            // Refresh products
            const response = await api.get('/products');
            setProducts(response.data.data);
        } catch (error) {
            console.error('Error in bulk update', error);
            alert('Error al realizar actualización en bloque');
        }
    };

    const handleUpdateStock = async (product: Product) => {
        const input = prompt(
            `Actualizar ${product.codigo}:\nStock actual: ${product.stock}\nUmbral Rojo: ${product.stock_low}\nUmbral Amarillo: ${product.stock_medium}\n\nIngrese nuevos valores separados por coma (stock, rojo, amarillo):`, 
            `${product.stock},${product.stock_low},${product.stock_medium}`
        );
        
        if (input === null || input === '') return;
        
        const [newStock, newLow, newMedium] = input.split(',').map(v => parseInt(v.trim()));
        
        if (isNaN(newStock)) return;

        try {
            await api.put(`/products/${product.codigo}`, { 
                stock: newStock,
                stock_low: isNaN(newLow) ? product.stock_low : newLow,
                stock_medium: isNaN(newMedium) ? product.stock_medium : newMedium
            });
            
            // Refresh to get calculated status from DB
            const response = await api.get('/products');
            setProducts(response.data.data);
        } catch (error: any) {
            console.error('Error updating stock', error);
            const msg = error.response?.data?.error || 'Error al actualizar stock';
            alert(msg);
        }
    };

    const handleSaveInfo = async () => {
        if (!editingProductInfo) return;
        try {
            await api.put(`/products/${editingProductInfo.codigo}`, { 
                info: tempInfo 
            });
            alert('Información actualizada');
            setEditingProductInfo(null);
            
            // Refresh products
            const response = await api.get('/products');
            setProducts(response.data.data);
        } catch (error: any) {
            console.error('Error updating info', error);
            alert(error.response?.data?.error || 'Error al actualizar información');
        }
    };

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
            <div className="bg-[#1A1A1A]/80 p-6 rounded-2xl shadow-2xl border border-white/5 flex flex-col md:flex-row gap-6 justify-between items-center backdrop-blur-xl sticky top-[80px] z-30">
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

                {user && (
                    <div className="flex space-x-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
                        {role === 'admin' && (
                            <button
                                onClick={handleBulkUpdateThresholds}
                                className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 border border-primary-500/20 mr-2"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Bloque
                            </button>
                        )}
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
                        
                        <button
                            onClick={handleDownloadExcel}
                            className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 border border-primary-500/20"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Lista Excel
                        </button>

                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 ml-auto">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-primary-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                title="Vista Compacta"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
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
                <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                    : "space-y-3"}>
                    {products.map((product) => {
                        const isOffer = product.precio_oferta > 0;
                        const finalPrice = isOffer ? product.precio_oferta : product.precio_lista * coeficiente;
                        const displayApp = product.aplicacion?.replace(/=/g, 'IDEM ') || '';

                        if (viewMode === 'compact') {
                            return (
                                <div key={product.codigo} className="bg-[#1A1A1A] rounded-xl border border-white/5 hover:border-primary-500/50 transition-all p-3 flex items-center gap-4 group">
                                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0">
                                        <img
                                            src={`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`}
                                            alt={product.codigo}
                                            className="w-full h-full object-cover cursor-zoom-in hover:opacity-80 transition-opacity"
                                            onClick={() => setSelectedImage(`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`)}
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                if (!target.src.includes('default.png')) {
                                                    target.src = `${import.meta.env.VITE_API_URL}/products/image/default`;
                                                }
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-black text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded tracking-tighter uppercase whitespace-nowrap">
                                                {product.codigo}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase truncate">
                                                {product.rubro} • {product.marca}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-bold text-gray-200 truncate group-hover:text-primary-500 transition-colors uppercase tracking-tight">
                                            {displayApp}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {product.stock_status && (
                                                <div className={`w-2 h-2 rounded-full ${
                                                    product.stock_status === 'red' ? 'bg-red-500' : 
                                                    product.stock_status === 'yellow' ? 'bg-yellow-400' : 
                                                    'bg-green-500'
                                                }`} />
                                            )}
                                            {isOffer && (
                                                <span className="text-[10px] line-through text-gray-600 font-bold">${formatPrice(product.precio_lista * coeficiente)}</span>
                                            )}
                                            <span className={`text-sm font-black ${isOffer ? 'text-red-500' : 'text-primary-500'}`}>
                                                ${formatPrice(finalPrice)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {product.info && (
                                            <button 
                                                onClick={() => setSelectedInfoProduct(product)}
                                                className="p-2 bg-primary-500/10 text-primary-500 rounded-lg hover:bg-primary-500/20 transition-all"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {role === 'client' && (
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="p-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-all shadow-lg active:scale-95"
                                            >
                                                <ShoppingCart className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={product.codigo} className="bg-[#1A1A1A] rounded-2xl shadow-xl border border-white/5 hover:border-primary-500/50 transition-all duration-300 overflow-hidden flex flex-col relative group hover:-translate-y-1">
                                {user && isOffer && (
                                    <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg z-20 shadow-lg flex items-center uppercase tracking-widest">
                                        <Tag className="w-2 h-2 mr-1" /> OFERTA
                                    </div>
                                )}
                                
                                {/* Product Image Container */}
                                <div className="w-full h-48 bg-[#121212] flex items-center justify-center group-hover:bg-[#0A0A0A] transition-colors relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`}
                                        alt={product.aplicacion || product.codigo}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 z-10 cursor-zoom-in"
                                        onClick={() => setSelectedImage(`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`)}
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            if (!target.src.includes('default.png')) {
                                                target.src = `${import.meta.env.VITE_API_URL}/products/image/default`;
                                            }
                                        }}
                                    />
                                </div>

                                <div className="p-5 flex-grow">
                                    {/* Tighter grouping for better identification */}
                                    <div className="flex items-center gap-3 mb-3 bg-black/30 p-2.5 rounded-lg border border-white/5">
                                        <span className="text-xs font-black text-primary-500 bg-primary-500/10 px-2.5 py-1 rounded tracking-widest uppercase">
                                            {product.codigo}
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-tight truncate">
                                            {product.rubro} • {product.marca}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-extrabold text-gray-100 mb-4 leading-snug group-hover:text-primary-500 transition-colors line-clamp-2 min-h-[2.5rem] tracking-tight uppercase">
                                        {displayApp}
                                    </h3>
                                    
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            {product.info && (
                                                <button
                                                    onClick={() => setSelectedInfoProduct(product)}
                                                    className="flex-grow flex items-center justify-center space-x-2 py-2.5 px-3 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary-500/20 transition-all group/info"
                                                >
                                                    <Info className="w-3.5 h-3.5 group-hover/info:scale-110 transition-transform" />
                                                    <span>+ Info</span>
                                                </button>
                                            )}
                                            {role === 'admin' && (
                                                <button
                                                    onClick={() => {
                                                        setEditingProductInfo(product);
                                                        setTempInfo(product.info || '');
                                                    }}
                                                    className={`py-2.5 px-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/5 transition-all ${!product.info ? 'w-full flex items-center justify-center space-x-2' : ''}`}
                                                    title="Editar Información"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    {!product.info && <span className="text-[10px] font-black uppercase tracking-widest ml-2">Cargar Info</span>}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {user && (
                                        <div className="flex items-center space-x-2 mt-3 p-1">
                                            {product.stock_status && (
                                                <div className={`w-3 h-3 rounded-full shadow-sm ${
                                                    product.stock_status === 'red' ? 'bg-red-500 animate-pulse' : 
                                                    product.stock_status === 'yellow' ? 'bg-yellow-400' : 
                                                    'bg-green-500'
                                                }`} title={`Stock: ${product.stock_status}`} />
                                            )}
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                                                {role === 'admin' ? `Stock: ${product.stock}` : (product.stock_status ? 'Disponibilidad' : '')}
                                            </span>
                                            {role === 'admin' && (
                                                <button 
                                                    onClick={() => handleUpdateStock(product)}
                                                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-primary-500 transition-colors"
                                                    title="Editar stock"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {user && (
                                    <div className="px-5 pb-5 pt-0 mt-auto flex items-end justify-between">
                                        <div className="flex flex-col">
                                            {isOffer && (
                                                <span className="text-[10px] line-through text-gray-600 font-bold tracking-tight mb-0.5">
                                                    ${formatPrice(product.precio_lista * coeficiente)}
                                                </span>
                                            )}
                                            <div className="flex items-baseline">
                                                <span className="text-xs font-black text-primary-500/80 mr-1">$</span>
                                                <span className={`text-2xl font-black tracking-tighter ${isOffer ? 'text-red-500' : 'text-primary-500'}`}>
                                                    {formatPrice(finalPrice)}
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
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Información de Producto */}
            {selectedInfoProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                        onClick={() => setSelectedInfoProduct(null)} 
                    />
                    <div className="relative bg-[#1A1A1A] border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-primary-500/20 to-transparent p-6 border-b border-white/5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-xs font-black tracking-widest text-primary-500 uppercase mb-1">{selectedInfoProduct.marca}</div>
                                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center">
                                        <Info className="w-5 h-5 mr-2 text-primary-500" />
                                        Detalles del Producto
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setSelectedInfoProduct(null)}
                                    className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8">
                            <div className="space-y-6">
                                <div>
                                    <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Información Adicional</div>
                                    <div className="bg-black/30 p-5 rounded-2xl border border-white/5 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                                        {selectedInfoProduct.info}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Rubro</div>
                                        <div className="text-sm font-bold text-gray-200 uppercase">{selectedInfoProduct.rubro}</div>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Aplicación</div>
                                        <div className="text-sm font-bold text-gray-200 uppercase">{selectedInfoProduct.aplicacion?.replace(/=/g, 'IDEM ') || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-[#121212] border-t border-white/5 flex justify-end">
                            <button
                                onClick={() => setSelectedInfoProduct(null)}
                                className="px-6 py-2.5 bg-primary-500 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-400 transition-all shadow-[0_5px_15px_rgba(255,184,0,0.2)] active:scale-95"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición de Información (Admin) */}
            {editingProductInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                        onClick={() => setEditingProductInfo(null)} 
                    />
                    <div className="relative bg-[#1A1A1A] border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
                        <div className="bg-gradient-to-r from-blue-500/20 to-transparent p-6 border-b border-white/5">
                            <h3 className="text-xl font-bold text-white tracking-tight flex items-center">
                                <Edit3 className="w-5 h-5 mr-2 text-blue-400" />
                                Editar Información
                            </h3>
                            <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest font-black">Producto: {editingProductInfo.codigo}</p>
                        </div>

                        <div className="p-8">
                            <textarea
                                value={tempInfo}
                                onChange={(e) => setTempInfo(e.target.value)}
                                className="w-full h-48 bg-black/30 border border-white/10 rounded-2xl p-4 text-gray-200 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-700 resize-none"
                                placeholder="Escribe aquí la información técnica o detalles del producto..."
                            />
                        </div>

                        <div className="p-6 bg-[#121212] border-t border-white/5 flex justify-end space-x-3">
                            <button
                                onClick={() => setEditingProductInfo(null)}
                                className="px-6 py-2.5 text-gray-500 font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveInfo}
                                className="px-8 py-2.5 bg-primary-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-400 transition-all shadow-[0_5px_15px_rgba(255,184,0,0.2)]"
                            >
                                Guardar Info
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90 z-[110]"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="w-8 h-8" />
                    </button>
                    
                    <div 
                        className="relative max-w-5xl w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            src={selectedImage} 
                            alt="Full size" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

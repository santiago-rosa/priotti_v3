import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { formatPrice } from '../lib/utils';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Search, Filter, ShoppingCart, Tag, Clock, Edit2, Edit3, Settings, Download, Info, LayoutGrid, List, X, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

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
    const [showMobileControls, setShowMobileControls] = useState(false);

    const [tempInfo, setTempInfo] = useState('');
    const [calcValue, setCalcValue] = useState<string>('0');

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
            {/* Header and Controls Container */}
            <div className="bg-surface/80 rounded-2xl shadow-2xl border border-white/5 backdrop-blur-xl sticky top-[80px] z-30 overflow-hidden transition-all duration-300">
                {/* Always Visible Row: Search and Toggle */}
                <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 md:items-center">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Search Bar */}
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-500 group-focus-within:text-primary-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-4 py-3 bg-surface-darker border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm transition-all text-white placeholder-gray-600 outline-none shadow-inner"
                                placeholder="¿Qué estás buscando? (código, marca, rubro...)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Expand Button (Mobile Only) */}
                        <button 
                            onClick={() => setShowMobileControls(!showMobileControls)}
                            className="md:hidden bg-primary-500 text-black p-3 rounded-xl shadow-lg active:scale-95 transition-transform shrink-0"
                            title={showMobileControls ? "Ocultar filtros" : "Más filtros"}
                        >
                            {showMobileControls ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* View Mode Toggle (Visible on desktop always) */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex bg-surface-darker p-1 rounded-xl border border-white/10 shrink-0">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-primary-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                title="Vista Compacta"
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Collapsible Section: Mode (on mobile), Calculator, Filters */}
                <div className={`${showMobileControls ? 'block' : 'hidden'} md:block transition-all animate-in fade-in slide-in-from-top-1 duration-300`}>
                    <div className="px-4 pb-6 md:px-6 md:pb-6 border-t md:border-t-0 border-white/5 space-y-4 md:space-y-0 md:flex md:flex-row md:items-center md:gap-4">
                        
                        {/* View Mode (Mobile-only within collapse) */}
                        <div className="md:hidden flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Modo de vista:</span>
                            <div className="flex bg-surface-darker p-1 rounded-xl border border-white/10 shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-black' : 'text-gray-500'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('compact')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-primary-500 text-black' : 'text-gray-500'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Price Calculator */}
                        <div className="relative group/calc w-full md:w-auto">
                            <div className="flex items-center bg-surface-darker border border-white/10 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary-500/50 transition-all shadow-inner uppercase tracking-widest text-[10px] font-black">
                                <Calculator className="w-4 h-4 text-primary-500 mr-3 shrink-0" />
                                <span className="text-gray-500 mr-2 shrink-0">%:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={calcValue}
                                    onChange={(e) => setCalcValue(e.target.value)}
                                    className="flex-1 md:w-14 bg-transparent border-none text-sm font-black text-white focus:ring-0 outline-none text-right placeholder-gray-700"
                                    placeholder="0.0"
                                />
                            </div>
                            {/* Tooltip explicativo */}
                            <div className="absolute top-full mt-2 left-0 w-64 bg-black/95 border border-white/10 p-4 rounded-2xl text-[10px] font-bold text-gray-400 opacity-0 group-hover/calc:opacity-100 transition-all translate-y-2 group-hover/calc:translate-y-0 pointer-events-none z-50 shadow-2xl backdrop-blur-xl">
                                <p className="text-primary-500 uppercase tracking-widest mb-2 flex items-center">
                                    <Info className="w-3.5 h-3.5 mr-2" /> ¿Cómo funciona?
                                </p>
                                <p className="mb-2 leading-relaxed">
                                    Aplica un margen de ganancia o descuento temporal a los precios que ves en pantalla.
                                </p>
                                <div className="space-y-1 bg-white/5 p-2 rounded-lg border border-white/5">
                                    <p><span className="text-white font-black">+ :</span> Aumenta precio.</p>
                                    <p><span className="text-white font-black">- :</span> Aplica descuento.</p>
                                </div>
                            </div>
                        </div>

                        {/* Filters and Actions (User Only) */}
                        {user && (
                            <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto items-center">
                                {role === 'admin' && (
                                    <button
                                        onClick={handleBulkUpdateThresholds}
                                        className="p-3 md:px-5 md:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 border border-primary-500/20"
                                    >
                                        <Settings className="w-4 h-4 md:mr-2" />
                                        <span className="hidden md:inline">Bloque</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all ${filter === 'all' ? 'bg-primary-500 text-black shadow-lg' : 'bg-white/5 text-gray-400 border border-white/5'}`}
                                >
                                    <Filter className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Todos</span>
                                </button>
                                <button
                                    onClick={() => setFilter('offers')}
                                    className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all ${filter === 'offers' ? 'bg-red-500 text-white shadow-lg' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                                >
                                    <Tag className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Ofertas</span>
                                </button>
                                <button
                                    onClick={() => setFilter('news')}
                                    className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all ${filter === 'news' ? 'bg-green-500 text-white shadow-lg' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}
                                >
                                    <Clock className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Novedades</span>
                                </button>
                                
                                <button
                                    onClick={handleDownloadExcel}
                                    title="Descargar Excel"
                                    className="p-3 md:px-5 md:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all bg-primary-500/10 text-primary-500 border border-primary-500/20"
                                >
                                    <Download className="w-5 h-5 md:w-4 md:h-4 md:mr-2" />
                                    <span className="hidden md:inline">Excel</span>
                                </button>
                            </div>
                        )}
                    </div>
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
                <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                    : "space-y-3"}>
                        {products.map((product) => {
                            const isOffer = product.precio_oferta > 0;
                            const basePrice = isOffer ? product.precio_oferta : product.precio_lista * coeficiente;
                            const markup = parseFloat(calcValue) || 0;
                            const finalPrice = basePrice * (1 + markup / 100);
                            const displayApp = product.aplicacion?.replace(/=/g, 'IDEM ') || '';

                            if (viewMode === 'compact') {
                                return (
                                    <div key={product.codigo} className="bg-surface rounded-xl border border-white/5 hover:border-primary-500/50 transition-all p-3 flex items-center gap-4 group">
                                        <div className="w-16 h-16 bg-surface-darker rounded-lg overflow-hidden flex-shrink-0">
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
                                            <span className="text-[15px] font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded tracking-tighter uppercase whitespace-nowrap">
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
                                                    <span className="text-[10px] line-through text-gray-600 font-bold">${formatPrice((product.precio_lista * coeficiente) * (1 + (parseFloat(calcValue) || 0) / 100))}</span>
                                                )}
                                                
                                                <div className="flex items-baseline gap-2">
                                                    {markup !== 0 && (
                                                        <span className="text-[10px] font-bold text-gray-500 tabular-nums">
                                                            ${formatPrice(basePrice)}
                                                        </span>
                                                    )}
                                                    <span className={`text-sm font-black ${isOffer ? 'text-red-500' : 'text-primary-500'}`}>
                                                        ${formatPrice(finalPrice)}
                                                    </span>
                                                </div>
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
                                <div key={product.codigo} className="bg-surface rounded-2xl shadow-xl border border-white/5 hover:border-primary-500/50 transition-all duration-300 overflow-hidden flex flex-col relative group hover:-translate-y-1">
                                    {user && isOffer && (
                                        <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg z-20 shadow-lg flex items-center uppercase tracking-widest">
                                            <Tag className="w-2 h-2 mr-1" /> OFERTA
                                        </div>
                                    )}
                                    
                                    {/* Product Image Container */}
                                    <div className="w-full h-48 bg-surface-darker flex items-center justify-center group-hover:bg-surface-light transition-colors relative overflow-hidden">
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
                                        <span className="text-[15px] font-black text-primary-500 bg-primary-500/10 px-3 py-1.5 rounded tracking-widest uppercase">
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
                                            <div className="flex flex-col">
                                                {markup !== 0 && (
                                                    <span className="text-[10px] font-bold text-gray-500 tabular-nums mb-0.5">
                                                        Original: ${formatPrice(basePrice)}
                                                    </span>
                                                )}
                                                <div className="flex items-baseline">
                                                    <span className="text-xs font-black text-primary-500/80 mr-1">$</span>
                                                    <span className={`text-2xl font-black tracking-tighter ${isOffer ? 'text-red-500' : 'text-primary-500'}`}>
                                                        {formatPrice(finalPrice)}
                                                    </span>
                                                </div>
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
                    <div className="relative bg-surface border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
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
                                    <div className="bg-surface-darker p-5 rounded-2xl border border-white/5 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap italic">
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
                        <div className="p-6 bg-surface-darker border-t border-white/5 flex justify-end">
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
                    <div className="relative bg-surface border border-white/10 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
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
                                className="w-full h-48 bg-surface-darker border border-white/10 rounded-2xl p-4 text-gray-200 text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-700 resize-none"
                                placeholder="Escribe aquí la información técnica o detalles del producto..."
                            />
                        </div>

                        <div className="p-6 bg-surface-darker border-t border-white/5 flex justify-end space-x-3">
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

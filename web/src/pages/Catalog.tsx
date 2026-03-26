import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/axios';
import { formatPrice } from '../lib/utils';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Search, Filter, ShoppingCart, Tag, Clock, Edit2, Edit3, Settings, Download, Info, LayoutGrid, List, X, Calculator, ChevronDown, ChevronUp, ImagePlus, Upload, CheckCircle, Globe, Link2, ExternalLink } from 'lucide-react';
import logoFallback from '../assets/logopriotti.png';

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
    const [brandFilter, setBrandFilter] = useState('');
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedInfoProduct, setSelectedInfoProduct] = useState<Product | null>(null);
    const [editingProductInfo, setEditingProductInfo] = useState<Product | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'compact'>('compact');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showMobileControls, setShowMobileControls] = useState(false);
    const [defaultImageProducts, setDefaultImageProducts] = useState<Set<string>>(new Set());
    const [uploadingProduct, setUploadingProduct] = useState<Product | null>(null);
    const [uploadTab, setUploadTab] = useState<'web' | 'file'>('web');
    // File tab state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    // URL tab state
    const [urlInput, setUrlInput] = useState('');
    const [urlPreview, setUrlPreview] = useState<string | null>(null);
    const [urlPreviewError, setUrlPreviewError] = useState(false);
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const [urlSaveSuccess, setUrlSaveSuccess] = useState(false);

    const [tempInfo, setTempInfo] = useState('');
    const [calcValue, setCalcValue] = useState<string>(
        () => localStorage.getItem('priotti-calc-value') ?? '0'
    );

    const { role, user } = useAuthStore();
    const addItem = useCartStore((state) => state.addItem);

    const coeficiente = user?.coeficiente || 1;

    const fetchProducts = useCallback(async (showLoader = false, overridePage?: number) => {
        if (showLoader) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (filter !== 'all') params.append('filter', filter);
            if (brandFilter) params.append('marca', brandFilter);
            params.append('page', (overridePage || page).toString());
            params.append('limit', '30');

            const response = await api.get(`/products?${params.toString()}`);
            setProducts(response.data.data);
            if (response.data.pagination) {
                setTotalPages(response.data.pagination.totalPages);
                setTotalItems(response.data.pagination.total);
            }
            // Update available brand pills from the API response
            if (Array.isArray(response.data.brands)) {
                setAvailableBrands(response.data.brands);
            } else if (!search) {
                setAvailableBrands([]);
            }
        } catch (error) {
            console.error('Error fetching products', error);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [search, filter, brandFilter, page]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(true);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [fetchProducts]);

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
            await fetchProducts(false);
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
            await fetchProducts(false);
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
            await fetchProducts(false);
        } catch (error: any) {
            console.error('Error updating info', error);
            alert(error.response?.data?.error || 'Error al actualizar información');
        }
    };

    const handleImageError = (codigo: string, e: React.SyntheticEvent<HTMLImageElement>) => {
        const target = e.currentTarget;
        // Guard: if we already switched to the fallback, do nothing (prevents infinite loop)
        if (target.getAttribute('data-fallback')) return;
        target.setAttribute('data-fallback', '1');
        // Use the locally-bundled logo — zero extra HTTP requests
        target.src = logoFallback;
        setDefaultImageProducts(prev => new Set(prev).add(codigo));
    };

    const resetUploadModal = () => {
        setUploadingProduct(null);
        setUploadFile(null);
        setUploadPreview(null);
        setUploadSuccess(false);
        setUrlInput('');
        setUrlPreview(null);
        setUrlPreviewError(false);
        setUrlSaveSuccess(false);
        setUploadTab('web');
    };

    const handleSelectUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadFile(file);
        setUploadPreview(URL.createObjectURL(file));
        setUploadSuccess(false);
    };

    const handleUploadImage = async () => {
        if (!uploadingProduct || !uploadFile) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', uploadFile);
            await api.post(`/products/${uploadingProduct.codigo}/image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadSuccess(true);
            setDefaultImageProducts(prev => { const next = new Set(prev); next.delete(uploadingProduct.codigo); return next; });
            setTimeout(async () => {
                await fetchProducts(false);
                resetUploadModal();
            }, 1200);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al subir la imagen');
        } finally {
            setIsUploading(false);
        }
    };

    const handlePreviewUrl = () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;
        setUrlPreviewError(false);
        setUrlPreview(trimmed);
        setUrlSaveSuccess(false);
    };

    const handleSaveFromUrl = async () => {
        if (!uploadingProduct || !urlInput.trim()) return;
        setIsFetchingUrl(true);
        try {
            await api.post(`/products/${uploadingProduct.codigo}/image-from-url`, { url: urlInput.trim() });
            setUrlSaveSuccess(true);
            setDefaultImageProducts(prev => { const next = new Set(prev); next.delete(uploadingProduct.codigo); return next; });
            setTimeout(async () => {
                await fetchProducts(false);
                resetUploadModal();
            }, 1400);
        } catch (error: any) {
            alert(error.response?.data?.error || 'No se pudo guardar la imagen desde esa URL');
        } finally {
            setIsFetchingUrl(false);
        }
    };

    const buildSearchQuery = (product: Product) =>
        encodeURIComponent(`${product.marca} ${product.codigo} ${product.rubro}`.trim());

    const googleImagesUrl = (product: Product) =>
        `https://www.google.com/search?tbm=isch&q=${buildSearchQuery(product)}`;

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
        <div className="space-y-6 text-text-primary">
            {/* Header and Controls Container */}
            <div className="bg-surface/80 rounded-2xl shadow-2xl border backdrop-blur-xl sticky top-[80px] z-30 overflow-hidden transition-all duration-300">
                {/* Always Visible Row: Search and Toggle */}
                <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 md:items-center">
                    <div className="flex items-center gap-4 flex-1">
                        {/* Search Bar */}
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-text-secondary group-focus-within:text-primary-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-4 py-3 bg-surface-darker border rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-sm transition-all text-text-primary placeholder-text-secondary/50 outline-none shadow-inner"
                                placeholder="¿Qué estás buscando? (código, marca, rubro...)"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setBrandFilter(''); setPage(1); }}
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
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-black shadow-lg' : 'text-text-secondary hover:text-white'}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-primary-500 text-black shadow-lg' : 'text-text-secondary hover:text-white'}`}
                                title="Vista Compacta"
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Brand Pills – shown only when there are search results with multiple brands */}
                {search && availableBrands.length > 1 && (
                    <div className="px-4 pb-3 md:px-6 flex flex-wrap gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest shrink-0 mr-1">Marca:</span>
                        <button
                            onClick={() => { setBrandFilter(''); setPage(1); }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                brandFilter === ''
                                    ? 'bg-primary-500 text-black border-primary-500 shadow-md'
                                    : 'bg-surface-darker text-text-secondary border hover:border-primary-500/50 hover:text-primary-500'
                            }`}
                        >
                            Todas
                        </button>
                        {availableBrands.map((brand) => (
                            <button
                                key={brand}
                                onClick={() => { setBrandFilter(brandFilter === brand ? '' : brand); setPage(1); }}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                    brandFilter === brand
                                        ? 'bg-primary-500 text-black border-primary-500 shadow-md'
                                        : 'bg-surface-darker text-text-secondary border hover:border-primary-500/50 hover:text-primary-500'
                                }`}
                            >
                                {brand}
                            </button>
                        ))}
                    </div>
                )}

                {/* Collapsible Section: Mode (on mobile), Calculator, Filters */}
                <div className={`${showMobileControls ? 'block' : 'hidden'} md:block transition-all animate-in fade-in slide-in-from-top-1 duration-300`}>
                    <div className="px-4 pb-6 md:px-6 md:pb-6 border-t md:border-t-0 border space-y-4 md:space-y-0 md:flex md:flex-row md:items-center md:gap-4">
                        
                        {/* View Mode (Mobile-only within collapse) */}
                        <div className="md:hidden flex justify-between items-center py-2 border-b border">
                            <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Modo de vista:</span>
                            <div className="flex bg-surface-darker p-1 rounded-xl border border-white/10 shrink-0">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-black' : 'text-text-secondary'}`}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('compact')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-primary-500 text-black' : 'text-text-secondary'}`}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Price Calculator */}
                        <div className="relative group/calc w-full md:w-auto">
                            <div className="flex items-center bg-surface-darker border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary-500/50 transition-all shadow-inner uppercase tracking-widest text-[10px] font-black">
                                <Calculator className="w-4 h-4 text-primary-500 mr-3 shrink-0" />
                                <span className="text-text-secondary mr-2 shrink-0">%:</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={calcValue}
                                    onChange={(e) => {
                                        setCalcValue(e.target.value);
                                        localStorage.setItem('priotti-calc-value', e.target.value);
                                    }}
                                    className="flex-1 md:w-14 bg-transparent border-none text-sm font-black text-text-primary focus:ring-0 outline-none text-right placeholder-text-secondary/30"
                                    placeholder="0.0"
                                />
                            </div>
                            {/* Tooltip explicativo */}
                            <div className="absolute top-full mt-2 left-0 w-64 bg-surface border p-4 rounded-2xl text-[10px] font-bold text-text-secondary opacity-0 group-hover/calc:opacity-100 transition-all translate-y-2 group-hover/calc:translate-y-0 pointer-events-none z-50 shadow-2xl backdrop-blur-xl">
                                <p className="text-primary-500 uppercase tracking-widest mb-2 flex items-center">
                                    <Info className="w-3.5 h-3.5 mr-2" /> ¿Cómo funciona?
                                </p>
                                <p className="mb-2 leading-relaxed">
                                    Aplica un margen de ganancia o descuento temporal a los precios que ves en pantalla.
                                </p>
                                <div className="space-y-1 bg-surface-darker p-2 rounded-lg border">
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
                                    onClick={() => { setFilter('all'); setPage(1); }}
                                    className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all ${filter === 'all' ? 'bg-primary-500 text-black shadow-lg' : 'bg-muted text-text-secondary border border'}`}
                                >
                                    <Filter className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Todos</span>
                                </button>
                                <button
                                    onClick={() => { setFilter('offers'); setPage(1); }}
                                    className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all ${filter === 'offers' ? 'bg-red-500 text-white shadow-lg' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                                >
                                    <Tag className="w-4 h-4 md:mr-2" />
                                    <span className="hidden md:inline">Ofertas</span>
                                </button>
                                <button
                                    onClick={() => { setFilter('news'); setPage(1); }}
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
            {!loading && totalItems > 0 && (
                <div className="flex justify-between items-center mb-2 text-[10px] font-black text-text-secondary px-2 uppercase tracking-widest">
                    <span>{totalItems} resultados</span>
                    <span>Pág {page} de {totalPages}</span>
                </div>
            )}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-surface p-12 text-center rounded-xl border border-dashed border-white/10">
                    <Search className="mx-auto h-12 w-12 text-gray-700 mb-4" />
                    <h3 className="text-lg font-medium text-gray-300">No se encontraron productos</h3>
                    <p className="mt-1 text-text-secondary">Intente ajustar los términos de búsqueda o filtros.</p>
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
                                    <div key={product.codigo} className="bg-surface rounded-xl border border hover:border-primary-500/50 transition-all p-3 flex items-center gap-4 group">
                                        <div className="w-16 h-16 bg-surface-darker rounded-lg overflow-hidden flex-shrink-0 relative group/img">
                                        <img
                                            src={`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`}
                                            alt={product.codigo}
                                            className="w-full h-full object-cover cursor-zoom-in hover:opacity-80 transition-opacity"
                                            onClick={() => !defaultImageProducts.has(product.codigo) && setSelectedImage(`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`)}
                                            onError={(e) => handleImageError(product.codigo, e)}
                                        />
                                        {role === 'admin' && defaultImageProducts.has(product.codigo) && (
                                            <button
                                                onClick={() => { setUploadingProduct(product); setUploadFile(null); setUploadPreview(null); setUploadSuccess(false); }}
                                                className="absolute inset-0 flex items-center justify-center bg-black/60 hover:bg-primary-500/80 transition-all rounded-lg"
                                                title="Cargar imagen"
                                            >
                                                <ImagePlus className="w-5 h-5 text-white" />
                                            </button>
                                        )}
                                        {role === 'admin' && !defaultImageProducts.has(product.codigo) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setUploadingProduct(product); setUploadFile(null); setUploadPreview(null); setUploadSuccess(false); }}
                                                className="absolute bottom-1 right-1 z-30 p-1 bg-black/70 hover:bg-primary-500 text-white hover:text-black rounded transition-all opacity-0 group-hover/img:opacity-100 backdrop-blur-sm"
                                                title="Reemplazar imagen"
                                            >
                                                <Upload className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex flex-col min-w-[120px]">
                                                <span className="text-[15px] font-bold text-primary-500 tracking-widest uppercase leading-none mb-1">
                                                    {product.codigo}
                                                </span>
                                                <span className="text-[15px] font-bold text-text-secondary uppercase truncate">
                                                    {product.rubro} • {product.marca}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-xs font-bold text-text-primary truncate group-hover:text-primary-500 transition-colors uppercase tracking-tight">
                                            {displayApp}
                                        </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {product.stock_status && (
                                                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                                                        product.stock_status === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                                        product.stock_status === 'yellow' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                                                        'bg-green-500/10 text-green-500 border-green-500/20'
                                                    }`}>
                                                        <div className={`w-1 h-1 rounded-full ${
                                                            product.stock_status === 'red' ? 'bg-red-500 animate-pulse' : 
                                                            product.stock_status === 'yellow' ? 'bg-yellow-500' : 
                                                            'bg-green-500'
                                                        }`} />
                                                        <span>
                                                            {product.stock_status === 'red' ? 'Sin stock' : 
                                                             product.stock_status === 'yellow' ? 'Stock limitado' : 
                                                             'En stock'}
                                                        </span>
                                                    </div>
                                                )}
                                                {isOffer && (
                                                    <span className="text-[10px] line-through text-gray-600 font-bold">${formatPrice((product.precio_lista * coeficiente) * (1 + (parseFloat(calcValue) || 0) / 100))}</span>
                                                )}
                                                
                                                <div className="flex items-baseline gap-2">
                                                    {markup !== 0 && (
                                                        <span className="text-[10px] font-bold text-text-secondary tabular-nums">
                                                            ${formatPrice(basePrice)}
                                                        </span>
                                                    )}
                                                    <span className={`text-sm font-bold ${isOffer ? 'text-red-500' : 'text-primary-500'}`}>
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
                                <div key={product.codigo} className="bg-surface rounded-2xl shadow-xl border border hover:border-primary-500/50 transition-all duration-300 overflow-hidden flex flex-col relative group hover:-translate-y-1">
                                    {user && isOffer && (
                                        <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg z-20 shadow-lg flex items-center uppercase tracking-widest">
                                            <Tag className="w-2 h-2 mr-1" /> OFERTA
                                        </div>
                                    )}
                                    
                                    {/* Product Image Container */}
                                    <div className="w-full h-48 bg-surface-darker flex items-center justify-center group-hover:bg-surface-light transition-colors relative overflow-hidden group/img">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <img
                                        src={`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`}
                                        alt={product.aplicacion || product.codigo}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 z-10 cursor-zoom-in"
                                        onClick={() => !defaultImageProducts.has(product.codigo) && setSelectedImage(`${import.meta.env.VITE_API_URL}/products/image/${product.imagen || product.codigo}`)}
                                        onError={(e) => handleImageError(product.codigo, e)}
                                    />
                                    {role === 'admin' && defaultImageProducts.has(product.codigo) && (
                                        <button
                                            onClick={() => { setUploadingProduct(product); setUploadFile(null); setUploadPreview(null); setUploadSuccess(false); }}
                                            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/50 hover:bg-primary-500/70 transition-all duration-300 backdrop-blur-sm"
                                            title="Cargar imagen del producto"
                                        >
                                            <ImagePlus className="w-8 h-8 text-white drop-shadow-lg" />
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow">Cargar Imagen</span>
                                        </button>
                                    )}
                                    {role === 'admin' && !defaultImageProducts.has(product.codigo) && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUploadingProduct(product); setUploadFile(null); setUploadPreview(null); setUploadSuccess(false); }}
                                            className="absolute bottom-3 right-3 z-30 p-2.5 bg-black/70 hover:bg-primary-500 text-white hover:text-black rounded-lg transition-all opacity-0 group-hover/img:opacity-100 backdrop-blur-sm shadow-lg"
                                            title="Reemplazar imagen"
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="p-4 flex-grow flex flex-col">
                                    <div className="space-y-2 mb-3 bg-surface-darker/60 p-3 rounded-xl border">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-text-secondary/50 uppercase tracking-[0.2em]">Código</span>
                                            <span className="text-[14px] font-bold text-primary-500 tracking-widest uppercase leading-none">
                                                {product.codigo}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-text-secondary/50 uppercase tracking-[0.2em]">Rubro</span>
                                            <span className="text-[13px] font-bold text-text-primary uppercase leading-snug">
                                                {product.rubro}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-text-secondary/50 uppercase tracking-[0.2em]">Marca</span>
                                            <span className="text-[13px] font-bold text-text-secondary uppercase tracking-tight">
                                                {product.marca}
                                            </span>
                                        </div>
                                    </div>

                                    {displayApp && (
                                        <h3 className="text-xs font-black text-text-primary mb-3 leading-snug group-hover:text-primary-500 transition-colors line-clamp-2 tracking-tight uppercase">
                                            {displayApp}
                                        </h3>
                                    )}
                                    
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
                                                    className={`py-2.5 px-3 bg-muted hover:bg-white/10 text-text-secondary hover:text-white rounded-lg border border transition-all ${!product.info ? 'w-full flex items-center justify-center space-x-2' : ''}`}
                                                    title="Editar Información"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                    {!product.info && <span className="text-[10px] font-black uppercase tracking-widest ml-2">Cargar Info</span>}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {user && (
                                        <div className="flex items-center gap-2 mt-2 p-1">
                                            {product.stock_status && (
                                                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${
                                                    product.stock_status === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                                    product.stock_status === 'yellow' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' : 
                                                    'bg-green-500/10 text-green-500 border-green-500/20'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        product.stock_status === 'red' ? 'bg-red-500 animate-pulse' : 
                                                        product.stock_status === 'yellow' ? 'bg-yellow-400' : 
                                                        'bg-green-500'
                                                    }`} />
                                                    <span>
                                                        {product.stock_status === 'red' ? 'Sin stock' : 
                                                         product.stock_status === 'yellow' ? 'Stock limitado' : 
                                                         'En stock'}
                                                    </span>
                                                </div>
                                            )}
                                            {role === 'admin' && (
                                                <div className="flex items-center gap-1 ml-auto">
                                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Stock: {product.stock}</span>
                                                    <button 
                                                        onClick={() => handleUpdateStock(product)}
                                                        className="p-1 hover:bg-white/10 rounded text-text-secondary hover:text-primary-500 transition-colors"
                                                        title="Editar stock"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {user && (
                                    <div className="px-5 pb-5 pt-0 mt-auto flex items-end justify-between">
                                        <div className="flex flex-col">
                                            <div className="flex flex-col">
                                                {markup !== 0 && (
                                                    <span className="text-[10px] font-bold text-text-secondary tabular-nums mb-0.5">
                                                        Original: ${formatPrice(basePrice)}
                                                    </span>
                                                )}
                                                <div className="flex items-baseline">
                                                    <span className="text-xs font-bold text-primary-500/80 mr-1">$</span>
                                                    <span className={`text-2xl font-bold tracking-tighter ${isOffer ? 'text-red-500' : 'text-primary-500'}`}>
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

            {!loading && totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-8 mb-4 py-4 px-2 border-t border-white/10 relative z-10 w-full overflow-x-auto">
                    <button
                        onClick={() => { const newPage = Math.max(1, page - 1); setPage(newPage); fetchProducts(true, newPage); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={page === 1}
                        className="p-2 rounded-xl bg-surface-darker text-text-secondary hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border whitespace-nowrap text-xs font-bold"
                    >
                        &lt; Anterior
                    </button>
                    <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .map((p, i, arr) => (
                                <React.Fragment key={p}>
                                    {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-600 px-1">...</span>}
                                    <button
                                        onClick={() => { setPage(p); fetchProducts(true, p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${page === p ? 'bg-primary-500 text-black shadow-lg scale-110' : 'bg-surface-darker text-text-secondary hover:bg-white/10 hover:text-white border border'}`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}
                    </div>
                    <button
                        onClick={() => { const newPage = Math.min(totalPages, page + 1); setPage(newPage); fetchProducts(true, newPage); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={page === totalPages}
                        className="p-2 rounded-xl bg-surface-darker text-text-secondary hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border whitespace-nowrap text-xs font-bold"
                    >
                        Siguiente &gt;
                    </button>
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
                        <div className="bg-gradient-to-r from-primary-500/20 to-transparent p-6 border-b border">
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
                                    className="p-2 hover:bg-muted rounded-xl text-text-secondary hover:text-white transition-colors"
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
                                    <div className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3">Información Adicional</div>
                                    <div className="bg-surface-darker p-5 rounded-2xl border border text-gray-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                                        {selectedInfoProduct.info}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted p-4 rounded-xl border border">
                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Rubro</div>
                                        <div className="text-sm font-bold text-text-primary uppercase">{selectedInfoProduct.rubro}</div>
                                    </div>
                                    <div className="bg-muted p-4 rounded-xl border border">
                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Aplicación</div>
                                        <div className="text-sm font-bold text-text-primary uppercase">{selectedInfoProduct.aplicacion?.replace(/=/g, 'IDEM ') || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-surface-darker border-t border flex justify-end">
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
                        <div className="bg-gradient-to-r from-blue-500/20 to-transparent p-6 border-b border">
                            <h3 className="text-xl font-bold text-white tracking-tight flex items-center">
                                <Edit3 className="w-5 h-5 mr-2 text-blue-400" />
                                Editar Información
                            </h3>
                            <p className="text-text-secondary text-xs mt-1 uppercase tracking-widest font-black">Producto: {editingProductInfo.codigo}</p>
                        </div>

                        <div className="p-8">
                            <textarea
                                value={tempInfo}
                                onChange={(e) => setTempInfo(e.target.value)}
                                className="w-full h-48 bg-surface-darker border border-white/10 rounded-2xl p-4 text-text-primary text-sm focus:ring-2 focus:ring-primary-500/50 outline-none transition-all placeholder-gray-700 resize-none"
                                placeholder="Escribe aquí la información técnica o detalles del producto..."
                            />
                        </div>

                        <div className="p-6 bg-surface-darker border-t border flex justify-end space-x-3">
                            <button
                                onClick={() => setEditingProductInfo(null)}
                                className="px-6 py-2.5 text-text-secondary font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest"
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
            {/* ── Modal: Cargar Imagen (Admin) ─────────────────────────────── */}
            {uploadingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={resetUploadModal} />

                    <div className="relative bg-surface border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">

                        {/* ── Header ───────────────────────────────────────────── */}
                        <div className="bg-gradient-to-r from-primary-500/20 via-primary-500/5 to-transparent p-6 border-b border">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-black tracking-widest text-primary-500 uppercase mb-1 flex items-center gap-2">
                                        <span className="bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded">{uploadingProduct.marca}</span>
                                        <span className="text-gray-600">•</span>
                                        <span className="text-text-secondary">{uploadingProduct.rubro}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                        <ImagePlus className="w-5 h-5 text-primary-500" />
                                        Cargar Imagen del Producto
                                    </h3>
                                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-1 font-mono">
                                        {uploadingProduct.codigo}
                                        {uploadingProduct.aplicacion && (
                                            <span className="text-gray-700 ml-2 normal-case">— {uploadingProduct.aplicacion.replace(/=/g, 'IDEM ').slice(0, 50)}</span>
                                        )}
                                    </p>
                                </div>
                                <button onClick={resetUploadModal} className="p-2 hover:bg-muted rounded-xl text-text-secondary hover:text-white transition-colors shrink-0">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* ── Tabs ─────────────────────────────────────────── */}
                            <div className="flex gap-1 mt-5 bg-surface-darker/50 p-1 rounded-xl border border">
                                <button
                                    onClick={() => setUploadTab('web')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        uploadTab === 'web'
                                            ? 'bg-primary-500 text-black shadow-lg'
                                            : 'text-text-secondary hover:text-white'
                                    }`}
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    Buscar en Internet
                                </button>
                                <button
                                    onClick={() => setUploadTab('file')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        uploadTab === 'file'
                                            ? 'bg-primary-500 text-black shadow-lg'
                                            : 'text-text-secondary hover:text-white'
                                    }`}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Subir Archivo
                                </button>
                            </div>
                        </div>

                        {/* ── Tab: Buscar en Internet ─────────────────────────── */}
                        {uploadTab === 'web' && (
                            <div className="p-6 space-y-5">

                                {/* Google Images button */}
                                <div>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-3">Buscar con — abrirá una nueva pestaña</p>
                                    <a
                                        href={googleImagesUrl(uploadingProduct)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-muted hover:bg-primary-500/10 border border hover:border-primary-500/30 rounded-xl transition-all group/link"
                                    >
                                        <span className="text-lg">🔍</span>
                                        <span className="text-[10px] font-black text-text-secondary group-hover/link:text-primary-500 uppercase tracking-widest">Google Imágenes</span>
                                        <ExternalLink className="w-3 h-3 text-gray-700 group-hover/link:text-primary-500 transition-colors ml-auto" />
                                    </a>
                                </div>

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-muted" />
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Luego pegá la URL de la imagen aquí</span>
                                    <div className="flex-1 h-px bg-muted" />
                                </div>

                                {/* URL Input + Preview button */}
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                        <input
                                            type="url"
                                            value={urlInput}
                                            onChange={(e) => { setUrlInput(e.target.value); setUrlPreview(null); setUrlPreviewError(false); setUrlSaveSuccess(false); }}
                                            onKeyDown={(e) => e.key === 'Enter' && handlePreviewUrl()}
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                            className="w-full pl-9 pr-4 py-2.5 bg-surface-darker border border-white/10 rounded-xl text-xs text-text-primary placeholder-gray-700 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={handlePreviewUrl}
                                        disabled={!urlInput.trim()}
                                        className="px-4 py-2.5 bg-muted hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-gray-300 uppercase tracking-widest transition-all disabled:opacity-40 shrink-0"
                                    >
                                        Preview
                                    </button>
                                </div>

                                {/* URL Image Preview */}
                                <div className="w-full h-44 bg-surface-darker rounded-2xl border border flex items-center justify-center overflow-hidden relative">
                                    {urlSaveSuccess ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <CheckCircle className="w-12 h-12 text-green-400" />
                                            <span className="text-green-400 font-black text-sm uppercase tracking-widest">¡Imagen guardada!</span>
                                        </div>
                                    ) : urlPreview ? (
                                        <>
                                            <img
                                                src={urlPreview}
                                                alt="URL preview"
                                                className="w-full h-full object-contain"
                                                onError={() => { setUrlPreviewError(true); setUrlPreview(null); }}
                                            />
                                            {urlPreviewError && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400">
                                                    <X className="w-8 h-8" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No se pudo cargar la imagen</p>
                                                    <p className="text-[9px] text-gray-600">Verificá que la URL sea directa a una imagen</p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-700">
                                            <Globe className="w-10 h-10" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">La imagen aparecerá aquí</p>
                                            <p className="text-[9px] text-gray-600 max-w-52 text-center leading-relaxed">
                                                Abrí Google Imágenes ↑, encontrá una foto, hacé clic derecho → "Copiar dirección de imagen" y pegala arriba.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-3 pt-1">
                                    <button onClick={resetUploadModal} className="px-5 py-2.5 text-text-secondary font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveFromUrl}
                                        disabled={!urlInput.trim() || isFetchingUrl || urlSaveSuccess || urlPreviewError}
                                        className="px-8 py-2.5 bg-primary-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-400 transition-all shadow-[0_5px_15px_rgba(255,184,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isFetchingUrl ? (
                                            <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Descargando...</>
                                        ) : (
                                            <><Upload className="w-3.5 h-3.5" />Guardar desde URL</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Subir Archivo ──────────────────────────────── */}
                        {uploadTab === 'file' && (
                            <div className="p-6 space-y-5">
                                {/* Preview */}
                                <div className="w-full h-52 bg-surface-darker rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative">
                                    {uploadPreview ? (
                                        <img src={uploadPreview} alt="Preview" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 text-gray-700">
                                            <Upload className="w-10 h-10" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Seleccioná un archivo</span>
                                        </div>
                                    )}
                                    {uploadSuccess && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-2">
                                            <CheckCircle className="w-12 h-12 text-green-400" />
                                            <span className="text-green-400 font-black text-sm uppercase tracking-widest">¡Imagen guardada!</span>
                                        </div>
                                    )}
                                </div>

                                {/* File picker */}
                                <label className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-muted hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all group/label">
                                    <Upload className="w-4 h-4 text-primary-500 group-hover/label:scale-110 transition-transform" />
                                    <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">
                                        {uploadFile ? uploadFile.name : 'Elegir imagen del equipo...'}
                                    </span>
                                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleSelectUploadFile} />
                                </label>

                                {uploadFile && (
                                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center">
                                        Se guardará como: <span className="text-primary-500">{uploadingProduct.imagen || uploadingProduct.codigo}.{uploadFile.name.split('.').pop()}</span>
                                    </p>
                                )}

                                {/* Footer */}
                                <div className="flex justify-end gap-3">
                                    <button onClick={resetUploadModal} className="px-5 py-2.5 text-text-secondary font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUploadImage}
                                        disabled={!uploadFile || isUploading || uploadSuccess}
                                        className="px-8 py-2.5 bg-primary-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-400 transition-all shadow-[0_5px_15px_rgba(255,184,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isUploading ? (
                                            <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />Subiendo...</>
                                        ) : (
                                            <><Upload className="w-3.5 h-3.5" />Guardar Imagen</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
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

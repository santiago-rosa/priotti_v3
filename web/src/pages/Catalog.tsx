import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/axios';
import { formatPrice } from '../lib/utils';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Search, Filter, ShoppingCart, Tag, Clock, Edit2, Edit3, Settings, Download, Info, LayoutGrid, List, X, Calculator, ChevronLeft, ChevronRight, ImagePlus, Upload, CheckCircle, Globe, Link2, ExternalLink } from 'lucide-react';
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
    oferta_descripcion?: string;
    descuento_global?: number;
}

export const Catalog = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'offers' | 'news'>('all');
    const [brandFilter, setBrandFilter] = useState('');
    const [rubroFilter, setRubroFilter] = useState('');
    const [activeDiscounts, setActiveDiscounts] = useState<any[]>([]);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [availableBrands, setAvailableBrands] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedInfoProduct, setSelectedInfoProduct] = useState<Product | null>(null);
    const [editingProductInfo, setEditingProductInfo] = useState<Product | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'compact'>('compact');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
    const [offerEditProduct, setOfferEditProduct] = useState<Product | null>(null);
    const [tempOfferPrice, setTempOfferPrice] = useState('');
    const [tempOfferDesc, setTempOfferDesc] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);

    const { role, user } = useAuthStore();
    const addItem = useCartStore((state) => state.addItem);

    // coeficiente is now applied by the backend API to prevent exposing base list prices
    const coeficiente = 1;

    const fetchProducts = useCallback(async (showLoader = false, overridePage?: number) => {
        if (showLoader) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (filter !== 'all') params.append('filter', filter);
            if (brandFilter) params.append('marca', brandFilter);
            if (rubroFilter) params.append('rubro', rubroFilter);
            params.append('page', (overridePage || page).toString());
            params.append('limit', '30');

            const response = await api.get(`/products?${params.toString()}`);
            setProducts(response.data.data);
            if (response.data.pagination) {
                setTotalPages(response.data.pagination.totalPages);
                setTotalItems(response.data.pagination.total);
            }
            // Update available brand pills from the API response
            if (Array.isArray(response.data.brands) && (search || filter === 'offers')) {
                setAvailableBrands(response.data.brands);
            } else {
                setAvailableBrands([]);
            }
        } catch (error) {
            console.error('Error fetching products', error);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [search, filter, brandFilter, rubroFilter, page]);

    const fetchActiveDiscounts = useCallback(async () => {
        try {
            const { data } = await api.get('/discounts');
            setActiveDiscounts(data.data);
        } catch (error) {
            console.error('Error fetching discounts');
        }
    }, []);

    useEffect(() => {
        fetchActiveDiscounts();
    }, [fetchActiveDiscounts]);

    useEffect(() => {
        if (activeDiscounts.length <= 1) return;
        if ((brandFilter && rubroFilter) || isPaused) return;

        const interval = setInterval(() => {
            setIsTransitioning(true);
            setCarouselIndex((prev) => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, [activeDiscounts.length, brandFilter, rubroFilter, isPaused]);

    const handleTransitionEnd = () => {
        if (carouselIndex >= activeDiscounts.length) {
            setIsTransitioning(false);
            setCarouselIndex(0);
        } else if (carouselIndex < 0) {
            setIsTransitioning(false);
            setCarouselIndex(activeDiscounts.length - 1);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(true);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [fetchProducts]);

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // hysteresis: expand at < 50px, shrink at > 200px
                    const currentScroll = window.scrollY;
                    if (currentScroll > 200) {
                        setIsScrolled(true);
                    } else if (currentScroll < 50) {
                        setIsScrolled(false);
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        const normalPrice = product.precio_lista * coeficiente;
        let finalPrice = normalPrice;

        const isOriginalOffer = product.precio_oferta > 0;
        const hasGlobalDiscount = !isOriginalOffer && (product.descuento_global || 0) > 0;

        if (isOriginalOffer) {
            finalPrice = product.precio_oferta;
        } else if (hasGlobalDiscount) {
            finalPrice = normalPrice * (1 - (product.descuento_global || 0) / 100);
        }

        addItem({
            codigo: product.codigo,
            marca: product.marca,
            rubro: product.rubro,
            aplicacion: product.aplicacion,
            precio: parseFloat(finalPrice.toFixed(2)),
            cantidad: quantity,
            imagen: product.imagen
        });
    };



    const handleSaveOffer = async () => {
        if (!offerEditProduct) return;
        const price = parseFloat(tempOfferPrice);
        const newPrice = isNaN(price) || tempOfferPrice.trim() === '' ? 0 : Math.max(0, price);
        try {
            await api.put(`/products/${offerEditProduct.codigo}`, {
                precio_oferta: newPrice,
                oferta_descripcion: tempOfferDesc
            });
            setOfferEditProduct(null);
            await fetchProducts(false);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error al guardar el precio de oferta');
        }
    };


    return (
        <div className="space-y-6 text-text-primary">
            {/* Header and Controls Container */}
            <div className={`bg-surface rounded-2xl shadow-2xl border backdrop-blur-xl sticky top-[80px] z-30 overflow-hidden transition-all duration-300 ${isScrolled ? 'mx-4' : ''}`}>
                <div className={`flex flex-col lg:flex-row items-stretch ${isScrolled ? 'min-h-0' : 'min-h-[160px]'}`}>
                    {/* Left Section: Search & Filters */}
                    <div className={`p-4 lg:p-6 flex flex-col justify-center gap-4 bg-surface/30 min-w-0 transition-all duration-300 ${isScrolled ? 'w-full grow' : 'w-full lg:w-4/6 lg:border-r border-white/5'}`}>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-text-secondary group-focus-within:text-primary-500" />
                            </div>
                            <input
                                type="text"
                                className={`block w-full pl-12 pr-4 bg-white/95 border-2 border-primary-500/10 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-base text-black placeholder-black/30 font-bold outline-none shadow-xl transition-all ${isScrolled ? 'py-2.5' : 'py-4'}`}
                                placeholder="Búsqueda rápida de productos, marcas o rubros..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setBrandFilter(''); setRubroFilter(''); setPage(1); }}
                            />
                        </div>

                        {/* Condensed Filters Row */}
                        {!isScrolled && (
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                                <div className="flex items-center bg-surface-darker/80 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-black shrink-0">
                                    <Calculator className="w-4 h-4 text-primary-500 mr-3" />
                                    <span className="text-text-secondary mr-2">% MARGEN:</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={calcValue}
                                        onChange={(e) => { setCalcValue(e.target.value); localStorage.setItem('priotti-calc-value', e.target.value); }}
                                        className="w-12 bg-transparent border-none text-text-primary focus:ring-0 outline-none text-right font-black"
                                    />
                                </div>
                                <div className="flex gap-1.5 h-10">
                                    {user && role === 'admin' && (
                                        <button
                                            onClick={handleBulkUpdateThresholds}
                                            className="px-3 rounded-xl transition-all bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/10"
                                            title="Actualización por Bloque"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setFilter('all'); setBrandFilter(''); setRubroFilter(''); setPage(1); }}
                                        className={`px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filter === 'all' && !brandFilter && !rubroFilter ? 'bg-primary-500 text-black shadow-lg' : 'bg-surface-darker/60 text-text-secondary hover:text-white'}`}
                                    >
                                        <Filter className="w-4 h-4" /> Todos
                                    </button>
                                    <button
                                        onClick={() => { 
                                            if (filter === 'offers') {
                                                setFilter('all');
                                            } else {
                                                setFilter('offers'); setBrandFilter(''); setRubroFilter(''); 
                                            }
                                            setPage(1); 
                                        }}
                                        className={`px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filter === 'offers' ? 'bg-red-500 text-white shadow-lg' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'} ${!loading && totalItems === 0 && filter === 'offers' ? 'animate-blink-attention' : ''}`}
                                    >
                                        <Tag className="w-4 h-4" /> Ofertas
                                    </button>
                                    <button
                                        onClick={() => { 
                                            if (filter === 'news') {
                                                setFilter('all');
                                            } else {
                                                setFilter('news'); setBrandFilter(''); setRubroFilter(''); 
                                            }
                                            setPage(1); 
                                        }}
                                        className={`px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filter === 'news' ? 'bg-green-500 text-white shadow-lg' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'} ${!loading && totalItems === 0 && filter === 'news' ? 'animate-blink-attention' : ''}`}
                                    >
                                        <Clock className="w-4 h-4" /> Novedades
                                    </button>
                                </div>
                                <button
                                    onClick={handleDownloadExcel}
                                    className="px-4 h-10 bg-surface-darker/60 text-text-secondary hover:text-primary-500 rounded-xl transition-all border border-white/5 ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <Download className="w-4 h-4" /> Excel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Section: Compact Carousel - Hidden if scrolled */}
                    {!isScrolled && (
                        <div className="w-full lg:w-2/6 bg-surface-darker/10 relative overflow-hidden group/carousel min-w-0">
                            {activeDiscounts.length > 0 ? (
                                <div 
                                    className="h-full w-full relative"
                                    onMouseEnter={() => setIsPaused(true)}
                                    onMouseLeave={() => setIsPaused(false)}
                                >
                                    {/* Nav Buttons */}
                                    <button 
                                        onClick={() => { setIsTransitioning(true); setCarouselIndex(prev => prev - 1); }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/carousel:opacity-100 transition-all backdrop-blur-md border border-white/10"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    <div className="h-full w-full overflow-hidden">
                                        <div 
                                            className={`h-full flex ${isTransitioning ? 'transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)' : ''}`}
                                            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                                            onTransitionEnd={handleTransitionEnd}
                                        >
                                            {[...activeDiscounts, ...activeDiscounts.slice(0, 1)].map((d, idx) => (
                                                <div key={`discount-${d.id || idx}-${idx}`} className="w-full min-w-full h-full flex-shrink-0 flex items-center justify-center p-3">
                                                    <button
                                                        onClick={() => {
                                                            if (brandFilter === d.marca && rubroFilter === d.rubro) {
                                                                setBrandFilter(''); setRubroFilter('');
                                                            } else {
                                                                setBrandFilter(d.marca); setRubroFilter(d.rubro); setSearch(''); setFilter('all');
                                                            }
                                                            setPage(1);
                                                        }}
                                                        className={`group/card relative w-full h-full max-h-[140px] flex items-center gap-4 px-6 rounded-2xl transition-all duration-300 ${brandFilter === d.marca && rubroFilter === d.rubro 
                                                            ? `bg-primary-500 text-black shadow-2xl scale-95 ${!loading && totalItems === 0 ? 'animate-blink-attention' : ''}` 
                                                            : 'bg-surface border border-white/5 shadow-xl'}`}
                                                    >
                                                        <div className={`p-2.5 rounded-xl transition-all duration-500 ${brandFilter === d.marca && rubroFilter === d.rubro ? 'bg-black/10 scale-110' : 'bg-primary-500/10'}`}>
                                                            <Tag className={`w-6 h-6 ${brandFilter === d.marca && rubroFilter === d.rubro ? 'text-black' : 'text-primary-500'}`} />
                                                        </div>
                                                        <div className="flex flex-col items-start text-left min-w-0 flex-1">
                                                            <span className={`text-base font-black uppercase tracking-tighter ${brandFilter === d.marca && rubroFilter === d.rubro ? 'text-black' : 'text-primary-500'}`}>DTO {d.porcentaje}%</span>
                                                            <h4 className={`text-xs font-black uppercase tracking-widest truncate w-full ${brandFilter === d.marca && rubroFilter === d.rubro ? 'text-black/80' : 'text-text-primary'}`}>{d.marca}</h4>
                                                            <span className={`text-[9px] font-bold uppercase truncate w-full ${brandFilter === d.marca && rubroFilter === d.rubro ? 'text-black/60' : 'text-text-secondary'}`}>{d.rubro}</span>
                                                        </div>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => { setIsTransitioning(true); setCarouselIndex(prev => prev + 1); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/40 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/carousel:opacity-100 transition-all backdrop-blur-md border border-white/10"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-text-secondary/10">
                                    <Tag className="w-10 h-10" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Brand Pills – hidden if scrolled */}
                {!isScrolled && (search || filter === 'offers') && availableBrands.length > 1 && (
                    <div className="px-4 pb-3 md:px-6 flex flex-wrap gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest shrink-0 mr-1">Marca:</span>
                        <button
                            onClick={() => { setBrandFilter(''); setRubroFilter(''); setPage(1); }}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${brandFilter === '' && rubroFilter === ''
                                    ? 'bg-primary-500 text-black border-primary-500 shadow-md'
                                    : 'bg-surface-darker text-text-secondary border hover:border-primary-500/50 hover:text-primary-500'
                                }`}
                        >
                            Todas
                        </button>
                        {availableBrands.map((brand) => (
                            <button
                                key={brand}
                                onClick={() => { setBrandFilter(brandFilter === brand ? '' : brand); setRubroFilter(''); setPage(1); }}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${brandFilter === brand
                                        ? 'bg-primary-500 text-black border-primary-500 shadow-md'
                                        : 'bg-surface-darker text-text-secondary border hover:border-primary-500/50 hover:text-primary-500'
                                    }`}
                            >
                                {brand}
                            </button>
                        ))}
                        {rubroFilter && (
                             <div className="flex items-center gap-2 px-3 py-1 bg-primary-500/10 text-primary-500 border border-primary-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <span>Rubro: {rubroFilter}</span>
                                <button onClick={() => { setRubroFilter(''); setPage(1); }} className="hover:text-white transition-colors">
                                    <X className="w-3 h-3" />
                                </button>
                             </div>
                        )}
                    </div>
                )}
            </div>

            {/* Grid */}
            {!loading && totalItems > 0 && (
                <div className="flex justify-between items-center mb-2 text-[10px] font-black text-text-secondary px-2 uppercase tracking-widest">
                    <div className="flex items-center gap-4">
                        <span>{totalItems} resultados</span>
                        
                        <div className="flex bg-surface-darker p-0.5 rounded-lg border border-white/5 shadow-inner scale-90">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary-500 text-black shadow-md' : 'text-text-secondary hover:text-white'}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'compact' ? 'bg-primary-500 text-black shadow-md' : 'text-text-secondary hover:text-white'}`}
                                title="Vista Compacta"
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
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
                        const isOriginalOffer = product.precio_oferta > 0;
                        const hasGlobalDiscount = !isOriginalOffer && (product.descuento_global || 0) > 0;
                        
                        const markup = parseFloat(calcValue) || 0;

                        // Normal price with calculator
                        const normalPrice = (product.precio_lista * coeficiente) * (1 + markup / 100);
                        
                        // Pricing Logic
                        let displayPrice = normalPrice;
                        let strikedPrice = null;
                        let offerDescription = product.oferta_descripcion;
                        let showOfferBadge = isOriginalOffer; // Only show toggle badge for original/individual offers

                        if (isOriginalOffer) {
                            displayPrice = product.precio_oferta;
                            strikedPrice = normalPrice;
                        } else if (hasGlobalDiscount) {
                            const discount = product.descuento_global || 0;
                            displayPrice = normalPrice * (1 - discount / 100);
                            strikedPrice = normalPrice;
                            offerDescription = `DTO EXTRA ${discount}% ${product.marca} / ${product.rubro}`;
                            showOfferBadge = false;
                        } else if (markup !== 0) {
                            strikedPrice = product.precio_lista * coeficiente;
                        }

                        const finalPrice = displayPrice;
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
                                        {user && (
                                            <div className="flex items-center gap-2 mt-1">
                                                {product.stock_status && (
                                                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border ${product.stock_status === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                            product.stock_status === 'yellow' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                                'bg-green-500/10 text-green-500 border-green-500/20'
                                                        }`}>
                                                        <div className={`w-1 h-1 rounded-full ${product.stock_status === 'red' ? 'bg-red-500 animate-pulse' :
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
                                                {showOfferBadge && (
                                                    <div
                                                        className="inline-flex items-center gap-1 border text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-red-500 text-white border-red-500 shadow-md"
                                                    >
                                                        <Tag className="w-2.5 h-2.5" /> OFERTA
                                                    </div>
                                                )}

                                                {(isOriginalOffer || hasGlobalDiscount) && offerDescription && (
                                                    <span className="text-[10px] text-red-500/70 font-bold italic truncate max-w-[150px]" title={offerDescription}>
                                                        {offerDescription}
                                                    </span>
                                                )}

                                                <div className="flex items-baseline gap-2">
                                                    {strikedPrice && (
                                                        <span className="text-[10px] font-bold text-text-secondary tabular-nums line-through opacity-50">
                                                            ${formatPrice(strikedPrice)}
                                                        </span>
                                                    )}
                                                    <span className={`text-sm font-bold transition-colors duration-300 ${(isOriginalOffer || hasGlobalDiscount) ? 'text-red-500 scale-110' : 'text-primary-500'}`}>
                                                        ${formatPrice(finalPrice)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
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
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => {
                                                    setOfferEditProduct(product);
                                                    setTempOfferPrice(product.precio_oferta > 0 ? String(product.precio_oferta) : '');
                                                    setTempOfferDesc(product.oferta_descripcion || '');
                                                }}
                                                className={`p-2 rounded-lg transition-all ${isOriginalOffer ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-muted text-text-secondary hover:bg-white/10 hover:text-red-400'}`}
                                                title={isOriginalOffer ? 'Editar oferta' : 'Agregar oferta'}
                                            >
                                                <Tag className="w-3.5 h-3.5" />
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
                                {user && showOfferBadge && (
                                    <div className="absolute top-3 right-3 z-30">
                                        <div className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-lg flex items-center uppercase tracking-widest border-2 border-white/20">
                                            <Tag className="w-2 h-2 mr-1" /> OFERTA
                                        </div>
                                    </div>
                                )}
                                {user && hasGlobalDiscount && (
                                    <div className="absolute top-3 right-3 z-30">
                                        <div className="bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-lg shadow-lg flex items-center uppercase tracking-widest border border-amber-400/50">
                                            <Tag className="w-2 h-2 mr-1" /> %{product.descuento_global} DTO
                                        </div>
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
                                                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm border ${product.stock_status === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        product.stock_status === 'yellow' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                                                            'bg-green-500/10 text-green-500 border-green-500/20'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${product.stock_status === 'red' ? 'bg-red-500 animate-pulse' :
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
                                                {strikedPrice && (
                                                    <span className="text-[10px] font-bold text-text-secondary tabular-nums mb-0.5 line-through opacity-50">
                                                        ${formatPrice(strikedPrice)}
                                                    </span>
                                                )}
                                                {(isOriginalOffer || hasGlobalDiscount) && offerDescription && (
                                                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 mb-2 max-w-[200px]">
                                                        <p className="text-[10px] text-red-400 font-bold italic leading-tight">
                                                            {offerDescription}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="flex items-baseline">
                                                    <span className={`text-xs font-bold mr-1 ${(isOriginalOffer || hasGlobalDiscount) ? 'text-red-500' : 'text-primary-500/80'}`}>$</span>
                                                    <span className={`text-2xl font-bold tracking-tighter transition-all duration-300 ${(isOriginalOffer || hasGlobalDiscount) ? 'text-red-500 scale-105 origin-left' : 'text-primary-500'}`}>
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
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => {
                                                    setOfferEditProduct(product);
                                                    setTempOfferPrice(product.precio_oferta > 0 ? String(product.precio_oferta) : '');
                                                    setTempOfferDesc(product.oferta_descripcion || '');
                                                }}
                                                className={`p-3 rounded-xl transition-all ${isOriginalOffer ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30' : 'bg-muted text-text-secondary hover:bg-white/10 border border'}`}
                                                title={isOriginalOffer ? 'Editar precio de oferta' : 'Agregar precio de oferta'}
                                            >
                                                <Tag className="w-4 h-4" />
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
                        className="p-2 rounded-xl bg-surface-darker text-text-secondary hover:text-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border whitespace-nowrap text-xs font-bold"
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
                                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${page === p ? 'bg-primary-500 text-black shadow-lg scale-110' : 'bg-surface-darker text-text-secondary hover:bg-white/10 hover:text-text-primary border border'}`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}
                    </div>
                    <button
                        onClick={() => { const newPage = Math.min(totalPages, page + 1); setPage(newPage); fetchProducts(true, newPage); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={page === totalPages}
                        className="p-2 rounded-xl bg-surface-darker text-text-secondary hover:text-text-primary hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border whitespace-nowrap text-xs font-bold"
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
                                    <div className="text-xs font-black tracking-widest text-primary-500 uppercase mb-1">{selectedInfoProduct.marca} - {selectedInfoProduct.codigo}</div>
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight flex items-center">
                                        <Info className="w-5 h-5 mr-2 text-primary-500" />
                                        Detalles del Producto
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedInfoProduct(null)}
                                    className="p-2 hover:bg-muted rounded-xl text-text-secondary hover:text-text-primary transition-colors"
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
                                    <div className="bg-surface-darker p-5 rounded-2xl border border text-text-secondary text-sm leading-relaxed whitespace-pre-wrap italic">
                                        {selectedInfoProduct.info}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-muted p-4 rounded-xl border border">
                                        <div className="text-[9px] font-black text-text-secondary/60 uppercase tracking-widest mb-1">Rubro</div>
                                        <div className="text-sm font-bold text-text-primary uppercase">{selectedInfoProduct.rubro}</div>
                                    </div>
                                    <div className="bg-muted p-4 rounded-xl border border">
                                        <div className="text-[9px] font-black text-text-secondary/60 uppercase tracking-widest mb-1">Aplicación</div>
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
                            <h3 className="text-xl font-bold text-text-primary tracking-tight flex items-center">
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
                                className="px-6 py-2.5 text-text-secondary font-bold hover:text-text-primary transition-colors uppercase text-[10px] tracking-widest"
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
                                    <h3 className="text-xl font-bold text-text-primary tracking-tight flex items-center gap-2">
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
                                <button onClick={resetUploadModal} className="p-2 hover:bg-muted rounded-xl text-text-secondary hover:text-text-primary transition-colors shrink-0">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* ── Tabs ─────────────────────────────────────────── */}
                            <div className="flex gap-1 mt-5 bg-surface-darker/50 p-1 rounded-xl border border">
                                <button
                                    onClick={() => setUploadTab('web')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${uploadTab === 'web'
                                            ? 'bg-primary-500 text-black shadow-lg'
                                            : 'text-text-secondary hover:text-white'
                                        }`}
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    Buscar en Internet
                                </button>
                                <button
                                    onClick={() => setUploadTab('file')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${uploadTab === 'file'
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
                                    <button onClick={resetUploadModal} className="px-5 py-2.5 text-text-secondary font-bold hover:text-text-primary transition-colors uppercase text-[10px] tracking-widest">
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
                                    <button onClick={resetUploadModal} className="px-5 py-2.5 text-text-secondary font-bold hover:text-text-primary transition-colors uppercase text-[10px] tracking-widest">
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

            {/* ── Modal: Editar Precio de Oferta (Admin) ────────────────────── */}
            {offerEditProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOfferEditProduct(null)} />
                    <div className="relative bg-surface border border-red-500/20 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="bg-gradient-to-r from-red-500/20 to-transparent p-6 border-b border-red-500/20">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
                                        <Tag className="w-3 h-3" /> Precio de Oferta
                                    </p>
                                    <h3 className="text-lg font-black text-text-primary tracking-tight">{offerEditProduct.codigo}</h3>
                                    <p className="text-xs text-text-secondary uppercase">{offerEditProduct.marca} · {offerEditProduct.rubro}</p>
                                </div>
                                <button onClick={() => setOfferEditProduct(null)} className="p-2 hover:bg-white/10 rounded-xl text-text-secondary hover:text-text-primary transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2">
                                    Precio de oferta (dejar vacío para quitar)
                                </label>
                                <div className="flex items-center bg-surface-darker border border-red-500/20 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-red-500/40 focus-within:border-red-500/50 transition-all">
                                    <span className="text-text-secondary font-black mr-2">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={tempOfferPrice}
                                        onChange={(e) => setTempOfferPrice(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveOffer()}
                                        className="flex-1 bg-transparent border-none text-text-primary font-black text-lg focus:ring-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        autoFocus
                                    />
                                </div>
                                {offerEditProduct.precio_oferta > 0 && (
                                    <p className="text-[9px] text-text-secondary mt-1 font-bold">
                                        Precio actual: <span className="text-red-400">${formatPrice(offerEditProduct.precio_oferta)}</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-text-secondary uppercase tracking-widest mb-2">
                                    Descripción de la oferta (opcional)
                                </label>
                                <textarea
                                    className="w-full bg-surface-darker border border-red-500/20 rounded-xl px-4 py-3 text-text-primary text-xs font-medium focus:ring-2 focus:ring-red-500/40 focus:border-red-500/50 outline-none transition-all resize-none h-24"
                                    placeholder="Ej: Oferta válida hasta fin de mes o agotar stock."
                                    value={tempOfferDesc}
                                    onChange={(e) => setTempOfferDesc(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                {offerEditProduct.precio_oferta > 0 && (
                                    <button
                                        onClick={async () => { setTempOfferPrice(''); await api.put(`/products/${offerEditProduct.codigo}`, { precio_oferta: 0 }); setOfferEditProduct(null); fetchProducts(false); }}
                                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        Quitar Oferta
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveOffer}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-[0_5px_15px_rgba(220,38,38,0.3)]"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

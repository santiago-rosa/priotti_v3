import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { ShoppingCart, LogOut, Menu, X, User, Sun, Moon, LogIn } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { api } from '../../lib/axios';
import logo from '../../assets/logopriotti.png';

export const Navbar = () => {
    const { user, role, logout, login } = useAuthStore();
    const { items, setIsOpen } = useCartStore();
    const { theme, toggleTheme } = useThemeStore();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loginNumero, setLoginNumero] = useState('');
    const [loginCuit, setLoginCuit] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const cartItemsCount = items.length;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleNavLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        try {
            const response = await api.post('/auth/login', { numero: loginNumero, cuit: loginCuit });
            const { token, role, user } = response.data;
            login(user, role, token);
            setMobileMenuOpen(false);
        } catch (err: any) {
            setLoginError(err.response?.data?.error || 'Datos incorrectos');
        } finally {
            setLoginLoading(false);
        }
    };

    const navLinks = !user
        ? [
            { name: 'Catálogo', path: '/' },
            { name: 'Contacto', path: '/contact' },
        ]
        : role === 'admin'
            ? [
                { name: 'Catálogo', path: '/' },
                { name: 'Historial', path: '/price-history' },
                { name: 'Mis Clientes', path: '/admin/clients' },
                { name: 'Sistema', path: '/admin/import' },
            ]
            : [
                { name: 'Catálogo', path: '/' },
                { name: 'Historial', path: '/price-history' },
                { name: 'Mis Pedidos', path: '/orders' },
                { name: 'Contacto', path: '/contact' },
            ];

    return (
        <nav className="bg-background/95 text-text-primary border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-none">
                <div className="flex justify-between h-20">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center group">
                            <img src={logo} alt="Priotti Logo" className="h-14 w-auto brightness-110 group-hover:scale-105 transition-transform" />
                            <span className="ml-3 font-bold text-xl tracking-tight hidden sm:block uppercase">
                                Felipe Priotti <span className="text-primary-500 text-xs">S.A.</span>
                            </span>
                        </Link>

                        {/* Desktop nav links */}
                        <div className="hidden md:ml-10 md:flex md:space-x-8">
                            {navLinks.map(link => (
                                <Link key={link.name} to={link.path} className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-400 hover:text-primary-500 border-b-2 border-transparent hover:border-primary-500 transition-all">
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Desktop right side */}
                    <div className="hidden md:flex items-center space-x-4">
                        {user ? (
                            <>
                                <div className="flex items-center text-sm">
                                    <User className="h-4 w-4 mr-2" />
                                    <span className="font-medium">{user.nombre}</span>
                                </div>

                                {role === 'client' && (
                                    <button
                                        onClick={() => setIsOpen(true)}
                                        className="relative p-2 text-gray-400 hover:text-primary-500 transition-colors"
                                        aria-label="Carrito"
                                    >
                                        <ShoppingCart className="h-6 w-6" />
                                        {cartItemsCount > 0 && (
                                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                                                {cartItemsCount}
                                            </span>
                                        )}
                                    </button>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-white/5 transition-colors"
                                    aria-label="Cerrar sesión"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </>
                        ) : (
                            <div className="relative">
                                <form onSubmit={handleNavLogin} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nro. Cliente"
                                        value={loginNumero}
                                        onChange={(e) => setLoginNumero(e.target.value)}
                                        required
                                        className="w-28 px-3 py-2 text-xs bg-surface-darker border border-white/10 rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary-500 transition-colors"
                                    />
                                    <input
                                        type="password"
                                        placeholder="CUIT"
                                        value={loginCuit}
                                        onChange={(e) => setLoginCuit(e.target.value)}
                                        required
                                        className="w-28 px-3 py-2 text-xs bg-surface-darker border border-white/10 rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary-500 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loginLoading}
                                        className="px-3 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-400 transition-all disabled:opacity-50 flex items-center"
                                        title="Ingresar"
                                    >
                                        {loginLoading ? (
                                            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        ) : (
                                            <LogIn className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </form>
                                {loginError && (
                                    <p className="absolute right-0 top-full mt-1 text-[10px] text-red-400 font-bold whitespace-nowrap bg-surface px-2 py-1 rounded border border-red-500/20 z-50">
                                        {loginError}
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                        >
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        {user && role === 'client' && (
                            <button
                                onClick={() => setIsOpen(true)}
                                className="relative p-2 mr-2 text-text-primary"
                            >
                                <ShoppingCart className="h-6 w-6" />
                                {cartItemsCount > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                                        {cartItemsCount}
                                    </span>
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-text-primary hover:bg-primary-500/10"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="p-2 ml-2 text-text-primary"
                        >
                            {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-surface border-b pb-6 animate-in slide-in-from-top duration-300">
                    <div className="pt-2 px-4 pb-3 space-y-2">
                        {user && (
                            <div className="flex items-center px-4 py-3 text-sm font-black border-b border-white/5 mb-4 text-primary-500 uppercase tracking-widest">
                                <User className="h-4 w-4 mr-3" />
                                {user.nombre}
                            </div>
                        )}
                        {navLinks.map(link => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-4 py-3 rounded-xl text-base font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                {link.name}
                            </Link>
                        ))}
                        {user ? (
                            <button
                                onClick={handleLogout}
                                className="w-full text-left mt-4 block px-4 py-3 rounded-xl text-base font-bold text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                            >
                                Cerrar sesión
                            </button>
                        ) : (
                            <form onSubmit={handleNavLogin} className="mt-4 px-1 space-y-3">
                                <input
                                    type="text"
                                    placeholder="Número de Cliente"
                                    value={loginNumero}
                                    onChange={(e) => setLoginNumero(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 text-sm bg-surface-darker border border-white/10 rounded-xl text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary-500"
                                />
                                <input
                                    type="password"
                                    placeholder="CUIT / Identificación"
                                    value={loginCuit}
                                    onChange={(e) => setLoginCuit(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 text-sm bg-surface-darker border border-white/10 rounded-xl text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-primary-500"
                                />
                                {loginError && (
                                    <p className="text-xs text-red-400 font-bold px-1">{loginError}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={loginLoading}
                                    className="w-full py-3 rounded-xl text-sm font-black bg-primary-500 text-black hover:bg-primary-400 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <LogIn className="w-4 h-4" />
                                    {loginLoading ? 'Ingresando...' : 'Ingresar'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

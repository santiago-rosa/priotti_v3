import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { ShoppingCart, LogOut, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import logo from '../../assets/logopriotti.png';

export const Navbar = () => {
    const { user, role, logout } = useAuthStore();
    const { items, setIsOpen } = useCartStore();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const cartItemsCount = items.reduce((acc, item) => acc + item.cantidad, 0);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = !user 
        ? [
            { name: 'Catálogo', path: '/' },
            { name: 'Contacto', path: '/contact' },
        ]
        : role === 'admin'
            ? [
                { name: 'Catálogo', path: '/' },
                { name: 'Mis Clientes', path: '/admin/clients' },
                { name: 'Actualizar Sistema', path: '/admin/import' },
            ]
            : [
                { name: 'Catálogo', path: '/' },
                { name: 'Mis Pedidos', path: '/orders' },
                { name: 'Contacto', path: '/contact' },
            ];

    return (
        <nav className="bg-[#0A0A0A] text-white border-b border-white/5 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center group">
                            <img src={logo} alt="Priotti Logo" className="h-10 w-auto brightness-110 group-hover:scale-105 transition-transform" />
                            <span className="ml-3 font-bold text-xl tracking-tight hidden sm:block">
                                PRIOTTI <span className="text-primary-500 text-xs">S.A.</span>
                            </span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:ml-10 md:flex md:space-x-8">
                            {navLinks.map(link => (
                                <Link key={link.name} to={link.path} className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-400 hover:text-primary-500 border-b-2 border-transparent hover:border-primary-500 transition-all">
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-6">
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
                            <Link
                                to="/login"
                                className="inline-flex items-center px-4 py-2 border border-primary-500 text-sm font-black rounded-xl text-primary-500 hover:bg-primary-500 hover:text-black transition-all uppercase tracking-widest"
                            >
                                Iniciar Sesión
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        {user && role === 'client' && (
                            <button
                                onClick={() => setIsOpen(true)}
                                className="relative p-2 mr-2 text-white"
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
                            className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-primary-700"
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-[#0A0A0A] border-b border-white/5 pb-6">
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
                            <Link
                                to="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="mt-4 block px-4 py-3 rounded-xl text-base font-black text-primary-500 border border-primary-500 hover:bg-primary-500 hover:text-black transition-all text-center uppercase tracking-widest"
                            >
                                Iniciar Sesión
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

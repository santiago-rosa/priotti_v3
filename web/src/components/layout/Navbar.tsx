import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { ShoppingCart, LogOut, Menu, X, User } from 'lucide-react';
import { useState } from 'react';

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

    const navLinks = role === 'admin'
        ? [
            { name: 'Dashboard', path: '/' },
            { name: 'Catálogo', path: '/catalog' },
            { name: 'Mis Clientes', path: '/admin/clients' },
            { name: 'Actualizar Sistema', path: '/admin/import' },
        ]
        : [
            { name: 'Inicio', path: '/' },
            { name: 'Catálogo', path: '/catalog' },
        ];

    return (
        <nav className="bg-primary-600 text-white shadow-lg sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center">
                            <span className="font-bold text-2xl tracking-tight">Priotti<span className="text-primary-200">.</span></span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:ml-10 md:flex md:space-x-8">
                            {navLinks.map(link => (
                                <Link key={link.name} to={link.path} className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-primary-100 transition-colors">
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-6">
                        <div className="flex items-center text-sm">
                            <User className="h-4 w-4 mr-2" />
                            <span className="font-medium">{user?.nombre}</span>
                        </div>

                        {role === 'client' && (
                            <button
                                onClick={() => setIsOpen(true)}
                                className="relative p-2 text-white hover:text-primary-100 transition-colors"
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
                            className="inline-flex items-center justify-center p-2 rounded-md hover:bg-primary-700 transition-colors"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        {role === 'client' && (
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
                <div className="md:hidden bg-primary-700 pb-3 p-2">
                    <div className="pt-2 px-3 pb-3 space-y-1">
                        <div className="flex items-center px-3 py-2 text-sm font-medium border-b border-primary-500 mb-2">
                            <User className="h-4 w-4 mr-2" />
                            {user?.nombre}
                        </div>
                        {navLinks.map(link => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-primary-600"
                            >
                                {link.name}
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="w-full text-left mt-2 block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-red-500/80 transition-colors"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

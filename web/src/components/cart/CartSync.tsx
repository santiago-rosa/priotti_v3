import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useCartSync } from '../../hooks/useCartSync';

export const CartSync = () => {
    const { user, role } = useAuthStore();
    const { syncFromDB } = useCartSync();
    const hasSynced = useRef(false);

    useEffect(() => {
        if (!user) {
            hasSynced.current = false;
            return;
        }
        if (role === 'client' && !hasSynced.current) {
            hasSynced.current = true;
            syncFromDB();
        }
    }, [user, role, syncFromDB]);

    return null;
};

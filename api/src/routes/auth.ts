import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    const { numero, cuit } = req.body;

    if (!numero || !cuit) {
        return res.status(400).json({ error: 'Faltan credenciales' });
    }

    try {
        // 1. Check Admin Hardcoded Login first
        if (numero === 'Administrador' && cuit === 'Tato1432') {
            const token = jwt.sign(
                { id: 0, numero: 'Admin', role: 'admin' },
                JWT_SECRET,
                { expiresIn: '12h' }
            );
            return res.json({ token, role: 'admin', user: { nombre: 'Administrador' } });
        }

        // 2. Check Client DB Login
        const cliente = await prisma.cliente.findUnique({
            where: { numero }
        });

        if (!cliente) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Check plaintext cuit as per v2 logic
        if (cliente.cuit !== cuit) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Update last login
        await prisma.cliente.update({
            where: { id: cliente.id },
            data: {
                fechaUltimoLogin: new Date(),
                visitas: { increment: 1 }
            }
        });

        // Sign JWT
        const token = jwt.sign(
            {
                id: cliente.id,
                numero: cliente.numero,
                role: 'client'
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        return res.json({
            token,
            role: 'client',
            user: {
                id: cliente.id,
                nombre: cliente.nombre,
                numero: cliente.numero,
                coeficiente: cliente.porcentajeaumento
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

export default router;

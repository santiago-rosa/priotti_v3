import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, authorizeAdmin } from '../middleware/auth';

const router = Router();

// GET /api/clients (Admin only)
router.get('/', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
    try {
        const clients = await prisma.cliente.findMany({
            orderBy: { nombre: 'asc' }
        });
        return res.json({ data: clients });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/clients (Admin only to create)
router.post('/', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
    const { nombre, numero, cuit, email, aumento } = req.body;

    try {
        const existing = await prisma.cliente.findUnique({ where: { numero } });
        if (existing) return res.status(400).json({ error: 'Ese numero de cliente ya existe' });

        await prisma.cliente.create({
            data: {
                nombre,
                numero,
                cuit,
                email: email || null,
                porcentajeaumento: aumento ? parseFloat(aumento) : 0,
                estado: 'ACTIVO'
            }
        });

        return res.json({ message: 'Cliente creado!' });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/clients/:id (Admin only to update)
router.put('/:id', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, numero, cuit, email, aumento, estado } = req.body;

    try {
        const check = await prisma.cliente.findUnique({ where: { numero } });
        if (check && check.id !== parseInt(id as string, 10)) {
            return res.status(400).json({ error: 'Ese numero de cliente ya existe!' });
        }

        await prisma.cliente.update({
            where: { id: parseInt(id as string, 10) },
            data: {
                nombre,
                numero,
                cuit,
                email: email || null,
                porcentajeaumento: aumento ? parseFloat(aumento) : 0,
                estado
            }
        });

        return res.json({ message: 'Cliente actualizado!' });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

export default router;

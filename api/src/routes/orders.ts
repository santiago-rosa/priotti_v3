import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Retrieve client's history
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    const clientId = req.user!.id;

    try {
        const orders = await prisma.pedido.findMany({
            where: {
                cliente: clientId,
                estado: 'LISTO'
            },
            orderBy: { fechapedido: 'desc' }
        });
        return res.json({ data: orders });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// Retrieve pending cart
router.get('/cart', authenticateToken, async (req: AuthRequest, res: Response) => {
    const clientId = req.user!.id;

    try {
        const pendingOrder = await prisma.pedido.findFirst({
            where: { cliente: clientId, estado: 'PENDIENTE' }
        });

        if (!pendingOrder) return res.json({ data: [] });

        // Parse v2 string format: codigo&marca&cant,codigo...
        const itemsArray = pendingOrder.items?.split(',').filter((i: string) => i !== '') || [];
        const jsonItems = itemsArray.map((item: string) => {
            const parts = item.split('&');
            return { codigo: parts[0], marca: parts[1], cantidad: parseInt(parts[2], 10) };
        });

        return res.json({ idpedidos: pendingOrder.idpedidos, items: jsonItems });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// Update or create pending cart (Payload: array of {codigo, marca, cantidad})
router.post('/cart', authenticateToken, async (req: AuthRequest, res: Response) => {
    const clientId = req.user!.id;
    const { items } = req.body; // Array of items

    try {
        let pendingOrder = await prisma.pedido.findFirst({
            where: { cliente: clientId, estado: 'PENDIENTE' }
        });

        // Formatting array to v2 compatible string required by PHP code
        const itemsString = items.map((i: any) => `${i.codigo}&${i.marca}&${i.cantidad}`).join(',') + (items.length ? ',' : '');

        if (!pendingOrder) {
            pendingOrder = await prisma.pedido.create({
                data: {
                    cliente: clientId,
                    estado: 'PENDIENTE',
                    items: itemsString
                }
            });
        } else {
            pendingOrder = await prisma.pedido.update({
                where: { idpedidos: pendingOrder.idpedidos },
                data: { items: itemsString }
            });
        }

        return res.json({ message: 'Cart updated', data: pendingOrder });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

// Checkout cart
router.post('/checkout', authenticateToken, async (req: AuthRequest, res: Response) => {
    const clientId = req.user!.id;

    try {
        const pendingOrder = await prisma.pedido.findFirst({
            where: { cliente: clientId, estado: 'PENDIENTE' }
        });

        if (!pendingOrder) return res.status(400).json({ error: 'No active cart found' });

        await prisma.pedido.update({
            where: { idpedidos: pendingOrder.idpedidos },
            data: { estado: 'LISTO', fechapedido: new Date() }
        });

        // TODO: Implement email notifications using Utils / Nodemailer 

        return res.json({ message: 'Pedido cerrado correctamente!' });
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, authorizeAdmin } from '../middleware/auth';

const router = Router();

// GET /api/products
// Optional query params: ?filter=offers | news
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    const { filter, search } = req.query;

    try {
        let whereCondition: any = { vigente: 1 };

        if (filter === 'offers') {
            whereCondition.precio_oferta = { gt: 0 };
        } else if (filter === 'news') {
            // Products added in the last 2 months
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            whereCondition.fecha_agregado = { gt: twoMonthsAgo };
        }

        if (search && typeof search === 'string') {
            const terms = search.split(' ').slice(0, 5); // up to 5 terms
            whereCondition.AND = terms.map(term => ({
                OR: [
                    { codigo: { contains: term } },
                    { aplicacion: { contains: term } },
                    { marca: { contains: term } },
                    { rubro: { contains: term } },
                    { info: { contains: term } }
                ]
            }));
        }

        const productos = await prisma.producto.findMany({
            where: whereCondition,
            orderBy: filter === 'news' ? { fecha_agregado: 'desc' } : undefined,
            take: filter === 'news' ? undefined : 100 // Similar to original limit
        });

        return res.json({ data: productos });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// PUT /api/products/:codigo
// Admin only inline editing
router.put('/:codigo', authenticateToken, authorizeAdmin, async (req: Request, res: Response) => {
    const codigo = String(req.params.codigo);
    const { precio_oferta, info } = req.body;

    if (precio_oferta === undefined || precio_oferta < 0) {
        return res.status(400).json({ error: 'Precio de oferta inválido' });
    }

    try {
        await prisma.producto.update({
            where: { codigo },
            data: {
                precio_oferta: parseFloat(precio_oferta),
                info: info || '',
                fecha_modif: new Date()
            }
        });

        return res.json({ message: 'Producto actualizado!' });
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Error al actualizar el producto' });
    }
});

export default router;

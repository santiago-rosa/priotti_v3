import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../index';
import { authenticateToken, authorizeAdmin } from '../middleware/auth';
import * as fs from 'fs';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Helper to clean and decode text lines
function decode(str: string) {
    return Buffer.from(str, 'latin1').toString('utf8').trim();
}

/**
 * POST /api/import/ofertas
 * Accepts single file: ofertas.txt
 */
router.post('/ofertas', authenticateToken, authorizeAdmin, upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'Falta el archivo ofertas.txt' });

    try {
        const fileContent = fs.readFileSync(req.file.path, 'latin1');
        const lines = fileContent.split('\n');
        let faltan: string[] = [];

        // Reset all offers to 0
        await prisma.producto.updateMany({ data: { precio_oferta: 0 } });

        for (const line of lines) {
            const aux = line.trim();
            if (aux !== '' && aux.includes('$')) {
                const parts = aux.split('$');
                const codigo = parts[0].trim();
                const oferta = parseFloat(parts[1].replace(/\./g, '').replace(',', '.'));

                const existing = await prisma.producto.findUnique({ where: { codigo } });
                if (!existing) {
                    faltan.push(`${codigo}--$${oferta}`);
                } else {
                    await prisma.producto.update({
                        where: { codigo },
                        data: { precio_oferta: oferta }
                    });
                }
            }
        }

        await prisma.actOferta.create({ data: { fecha: new Date() } });
        fs.unlinkSync(req.file.path);

        return res.json({ message: 'Ofertas actualizadas', faltan });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error procesando archivo' });
    }
});

/**
 * POST /api/import/lista
 * Accepts multiple files: aprecios.txt, alineasx.txt, arubrosx.txt
 */
router.post('/lista', authenticateToken, authorizeAdmin, upload.array('files'), async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length < 3) return res.status(400).json({ error: 'Faltan archivos (aprecios, alineas, arubros)' });

    try {
        const rubrosMap: Record<string, string> = {};
        const marcasMap: Record<string, string> = {};
        const productsMap: Record<string, { codigo: string; rubro: string; marca: string; aplicacion: string; precio_lista: number; imagen: string; }> = {};

        // 1. Parse Rubros & Marcas
        files.forEach(file => {
            const content = fs.readFileSync(file.path, 'latin1').split('\n');
            if (file.originalname.includes('rubro')) {
                content.forEach(line => {
                    if (line.trim()) {
                        rubrosMap[line.substring(0, 7)] = line.substring(7).replace(/'/g, '`').trim();
                    }
                });
            } else if (file.originalname.includes('lineas') || file.originalname.includes('marca')) {
                content.forEach(line => {
                    if (line.trim()) {
                        let nombre = line.substring(4).replace(/"/g, '').replace(/ /g, '').trim();
                        if (nombre === 'ARTICULOSSINSTOCK') nombre = '3M';
                        else if (nombre === 'FUSIBLESFICHADESNUDOS') nombre = 'GEN-ROD';
                        marcasMap[line.substring(0, 4)] = nombre;
                    }
                });
            }
        });

        // 2. Parse Precios
        const preciosFile = files.find(f => f.originalname.includes('precios') || f.originalname.includes('aprecios'));
        if (!preciosFile) return res.status(400).json({ error: 'Falta archivo aprecios.txt' });

        const preciosContent = fs.readFileSync(preciosFile.path, 'latin1').split('\n');
        preciosContent.forEach(line => {
            if (line.trim()) {
                const rubro = line.substring(0, 7);
                const marca = line.substring(0, 4);
                const codigo = line.substring(7, 27).trim();
                const desc = line.substring(27, 62).replace(/'/g, '`').trim();

                let rawPrecio = line.substring(62, 72);
                const precio = parseFloat(rawPrecio.substring(0, rawPrecio.length - 2) + '.' + rawPrecio.substring(rawPrecio.length - 2));

                const imagen = codigo.toLowerCase().replace(/ /g, '_').replace(/\//g, '-');

                if (!productsMap[codigo]) {
                    productsMap[codigo] = {
                        codigo,
                        rubro: rubrosMap[rubro] || rubro,
                        marca: marcasMap[marca] || marca,
                        aplicacion: desc,
                        precio_lista: precio,
                        imagen
                    };
                }
            }
        });

        // 3. Upsert DB
        let nue = 0, act = 0;
        const dbProducts = await prisma.producto.findMany();
        const dbMap = new Map(dbProducts.map((p: any) => [p.codigo, p]));
        const cambios = new Set<string>();

        // Mark all items as inactive first
        await prisma.producto.updateMany({ data: { vigente: 0 } });

        for (const codigo of Object.keys(productsMap)) {
            const p: any = productsMap[codigo];
            const existing: any = dbMap.get(codigo);

            if (!existing) {
                nue++;
                await prisma.producto.create({
                    data: {
                        ...p,
                        vigente: 1
                    }
                });
            } else {
                const changed = existing.marca !== p.marca || existing.aplicacion !== p.aplicacion || existing.rubro !== p.rubro || existing.precio_lista !== p.precio_lista;
                if (changed) {
                    act++;
                    cambios.add(p.marca);
                }
                await prisma.producto.update({
                    where: { codigo },
                    data: { ...p, vigente: 1, fecha_modif: changed ? new Date() : existing.fecha_modif }
                });
            }
        }

        const cambiosStr = Array.from(cambios).join(', ');
        await prisma.actLista.create({ data: { cambios: cambiosStr } });

        // Cleanup
        files.forEach(f => fs.unlinkSync(f.path));

        return res.json({ message: 'Lista importada', nuevos: nue, actualizados: act });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error procesando archivos' });
    }
});

/**
 * GET /api/import/status
 * Get the latest update dates for the dashboard
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
    try {
        const lastLista = await prisma.actLista.findFirst({ orderBy: { fecha: 'desc' } });
        const lastOferta = await prisma.actOferta.findFirst({ orderBy: { fecha: 'desc' } });

        return res.json({
            lista: lastLista?.fecha || null,
            cambios: lastLista?.cambios || '',
            ofertas: lastOferta?.fecha || null
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error' });
    }
});

export default router;

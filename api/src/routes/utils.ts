import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import ExcelJS from 'exceljs';
const router = Router();

// GET /api/utils/export
router.get('/export', authenticateToken, async (req: AuthRequest, res: Response) => {
    const clientId = req.user!.id;

    try {
        const cliente = await prisma.cliente.findUnique({ where: { id: clientId } });
        const coeficiente = cliente?.porcentajeaumento || 1;

        const productos = await prisma.producto.findMany({
            where: { vigente: { not: 0 } },
            orderBy: [
                { marca: 'asc' },
                { rubro: 'asc' },
                { codigo: 'asc' }
            ]
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Lista Priotti');

        sheet.columns = [
            { header: 'CODIGO', key: 'codigo', width: 25 },
            { header: 'MARCA', key: 'marca', width: 20 },
            { header: 'RUBRO', key: 'rubro', width: 20 },
            { header: 'APLICACION', key: 'aplicacion', width: 40 },
            { header: 'PRECIO', key: 'precio', width: 15 }
        ];

        productos.forEach((p: any) => {
            sheet.addRow({
                codigo: p.codigo,
                marca: p.marca,
                rubro: p.rubro,
                aplicacion: p.aplicacion?.replace(/=/g, 'IDEM '),
                precio: parseFloat((p.precio_lista * coeficiente).toFixed(2))
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'listapriotti.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error generating file' });
    }
});

// POST /api/utils/contact
router.post('/contact', async (req: Request, res: Response) => {
    const { name, phone, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Faltan campos (nombre, email, mensaje)' });
    }

    // TODO: Configure SMTP securely, using test logic here
    try {
        /*
        const transporter = nodemailer.createTransport({
          host: "smtp.example.com",
          port: 587,
          auth: { user: "user", pass: "pass" }
        });
        await transporter.sendMail({
          from: email,
          to: "admin@priotti.com",
          subject: `Nuevo mensaje de ${name}`,
          text: `${message}\n\nTel: ${phone}`
        });
        */
        console.log(`Email sim format: De ${name} (${email}): ${message}`);

        return res.json({ message: 'Mensaje enviado correctamente' });
    } catch (error) {
        return res.status(500).json({ error: 'Error enviando email' });
    }
});

export default router;

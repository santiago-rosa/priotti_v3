import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import productsRoutes from './routes/products';
import ordersRoutes from './routes/orders';
import clientsRoutes from './routes/clients';
import importRoutes from './routes/import';
import utilsRoutes from './routes/utils';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/utils', utilsRoutes);

app.get('/', (req: Request, res: Response) => {
    res.send('Priotti v3 API is running.');
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding the database with mock data...');

    // 1. Create Mock Admin and Client
    await prisma.cliente.upsert({
        where: { numero: 'Administrador' },
        update: {},
        create: {
            nombre: 'Administrador General',
            numero: 'Administrador',
            cuit: 'Tato1432',
            estado: 'ACTIVO',
            porcentajeaumento: 1.0,
            email: 'admin@priotti.com'
        }
    });

    await prisma.cliente.upsert({
        where: { numero: '1234' },
        update: {},
        create: {
            nombre: 'Cliente de Prueba',
            numero: '1234',
            cuit: '12345678',
            estado: 'ACTIVO',
            porcentajeaumento: 1.2, // 20% markup example
            email: 'cliente@prueba.com'
        }
    });

    // 2. Create Mock Products
    const mockProducts = [
        {
            codigo: 'PROD-001',
            marca: 'Filtros WIX',
            rubro: 'Filtros de Aceite',
            aplicacion: 'Volkswagen Gol Trend 1.6 / Saveiro',
            precio_lista: 1500.50,
            precio_oferta: 0,
            vigente: 1
        },
        {
            codigo: 'PROD-002',
            marca: 'NGK',
            rubro: 'Bujías',
            aplicacion: 'Renault Clio Mio 1.2 16v',
            precio_lista: 800.00,
            precio_oferta: 650.00, // Offer active
            vigente: 1
        },
        {
            codigo: 'PROD-003',
            marca: 'Bosch',
            rubro: 'Frenos',
            aplicacion: 'Pastillas de freno Peugeot 208',
            precio_lista: 4500.00,
            precio_oferta: 0,
            vigente: 1
        },
        {
            codigo: 'PROD-004',
            marca: 'SKF',
            rubro: 'Distribución',
            aplicacion: 'Kit Distribución Ford Fiesta Kinetic',
            precio_lista: 18500.00,
            precio_oferta: 17000.00,
            vigente: 1
        }
    ];

    for (const prod of mockProducts) {
        await prisma.producto.upsert({
            where: { codigo: prod.codigo },
            update: {},
            create: prod
        });
    }

    // 3. Create mock update dates
    await prisma.actLista.create({
        data: {
            cambios: 'Actualización inicial de base de datos local'
        }
    });

    await prisma.actOferta.create({
        data: {}
    });

    console.log('Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

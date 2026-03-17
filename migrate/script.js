require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const XLSX = require('xlsx');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');

const API_URL = process.env.API_URL || 'http://localhost:8080/api';
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_CUID = process.env.ADMIN_CUID;
const LISTAS_PATH = process.env.LISTAS_PATH || './../../';

async function main() {
    console.clear();
    console.log(chalk.bold.cyan('========================================'));
    console.log(chalk.bold.cyan('    PRIOTTI V3 - ACTUALIZADOR WEB      '));
    console.log(chalk.bold.cyan('========================================\n'));

    try {
        // 1. Encontrar archivos Excel
        const searchPath = path.resolve(LISTAS_PATH);
        console.log(chalk.gray(`Buscando archivos .xls en: ${searchPath}`));

        let allFiles = [];
        if (fs.existsSync(searchPath)) {
            allFiles = fs.readdirSync(searchPath)
                .filter(f => f.toLowerCase().endsWith('.xls'))
                .sort((a, b) => b.localeCompare(a));
        }

        if (allFiles.length < 2) {
            console.error(chalk.red(`\nError: Se necesitan al menos 2 archivos .xls en la carpeta 'listas' para realizar la comparación.`));
            console.log(chalk.yellow(`Archivos encontrados: ${allFiles.length}`));
            return;
        }

        // Selección de archivos
        console.log(chalk.yellow('Selección de archivos para comparar:'));
        
        const { newFileName } = await inquirer.prompt([
            {
                type: 'list',
                name: 'newFileName',
                message: 'Seleccione el archivo NUEVO (el que tiene los datos actuales):',
                choices: allFiles
            }
        ]);

        const otherFiles = allFiles.filter(f => f !== newFileName);

        const { oldFileName } = await inquirer.prompt([
            {
                type: 'list',
                name: 'oldFileName',
                message: 'Seleccione el archivo VIEJO (para buscar diferencias):',
                choices: otherFiles
            }
        ]);
        const actualFileName = oldFileName;

        console.log(`\n  ${chalk.gray('Nuevo (Actual):')} ${chalk.green(newFileName)}`);
        console.log(`  ${chalk.gray('Base (Viejo):')} ${chalk.white(actualFileName)}\n`);

        // 2. Construir listas
        console.log(chalk.blue('Analizando datos... (esto puede tardar unos segundos)'));
        let newList = buildListFromExcel(path.join(LISTAS_PATH, newFileName));
        let actualList = actualFileName ? buildListFromExcel(path.join(LISTAS_PATH, actualFileName)) : {};
        
        // 3. Generar Diff
        let diffData = buildUpdateData(actualList, newList);
        
        // --- MENU INTERACTIVO ---
        let exit = false;
        while (!exit) {
            const { choice } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: '¿Qué desea hacer?',
                    choices: [
                        { name: '📊 Ver resumen de cambios (Cantidades)', value: 'summary' },
                        { name: '🏷️  Ver marcas afectadas', value: 'brands' },
                        { name: '🔍 Ver listado de cambios de precio', value: 'details' },
                        { name: '🚀 ACTUALIZAR WEB CON ESTOS CAMBIOS', value: 'update' },
                        { name: '❌ Salir', value: 'exit' }
                    ]
                }
            ]);

            switch (choice) {
                case 'summary':
                    showSummary(diffData);
                    break;
                case 'brands':
                    showBrands(diffData);
                    break;
                case 'details':
                    showDetailedChanges(diffData, actualList, newList);
                    break;
                case 'update':
                    const confirmed = await confirmUpdate(diffData);
                    if (confirmed) {
                        await performUpdate(diffData);
                        exit = true;
                    }
                    break;
                case 'exit':
                    exit = true;
                    console.log(chalk.gray('Programa finalizado.'));
                    break;
            }
        }

    } catch (err) {
        console.error(chalk.red('\n❌ Ocurrió un error inesperado:'), err.message);
    }
}

function showSummary(data) {
    console.log(chalk.bold.white('\n--- RESUMEN DE CAMBIOS ---'));
    console.log(`${chalk.green('➕ Productos Nuevos (Insert):')}   ${data.insert.length}`);
    console.log(`${chalk.yellow('🔄 Cambios detectados (Update):')}  ${data.update.length}`);
    console.log(`${chalk.red('➖ Productos a ocultar (Delete):')} ${data.delete.length}`);
    console.log(chalk.gray('--------------------------\n'));
}

function showBrands(data) {
    console.log(chalk.bold.white('\n--- MARCAS CON CAMBIOS/NOVEDADES ---'));
    if (data.novelties.length === 0) {
        console.log(chalk.gray('No hay cambios en ninguna marca.'));
    } else {
        const sortedBrands = data.novelties.sort();
        // Mostrar en columnas
        for (let i = 0; i < sortedBrands.length; i += 3) {
            const row = sortedBrands.slice(i, i + 3).map(b => b.padEnd(20)).join('');
            console.log(chalk.cyan(row));
        }
    }
    console.log(chalk.gray('-------------------------------------\n'));
}

function showDetailedChanges(data, oldList, newList) {
    console.log(chalk.bold.white('\n--- DETALLE DE CAMBIOS (CAMBIOS DE PRECIO) ---'));
    
    const priceChanges = data.update.filter(item => {
        const oldItem = oldList[item.codigo];
        const newItem = newList[item.codigo];
        // Solo mostramos items que tengan un cambio que no sea solo 'info'
        // pero para simplificar, mostramos si el precio cambió
        return oldItem && newItem && oldItem.precio !== newItem.precio;
    });

    if (priceChanges.length === 0) {
        console.log(chalk.gray('No se detectaron cambios de precio en los artículos existentes.'));
    } else {
        console.log(chalk.gray(`${'#'.padEnd(5)} | ${'CÓDIGO'.padEnd(15)} | ${'MARCA'.padEnd(15)} | ${'PRECIO ANT.'.padEnd(12)} | ${'PRECIO NUEVO'}`));
        console.log(chalk.gray('-'.repeat(75)));
        
        priceChanges.forEach((item, index) => {
            const oldItem = oldList[item.codigo];
            const newItem = newList[item.codigo];
            console.log(
                `${chalk.gray((index + 1).toString().padEnd(5))} | ` +
                `${chalk.cyan(item.codigo.padEnd(15))} | ` +
                `${chalk.white(newItem.marca.padEnd(15))} | ` +
                `${chalk.red(('$' + (oldItem.precio || 0)).padEnd(12))} | ` +
                `${chalk.green('$' + (newItem.precio || 0))}`
            );
        });
    }

    if (data.insert.length > 0) {
        console.log(chalk.bold.white(`\n--- NUEVOS PRODUCTOS A CARGAR (${data.insert.length}) ---`));
        data.insert.slice(0, 10).forEach((item, index) => {
            console.log(`${chalk.gray((index + 1).toString().padEnd(5))} | ${chalk.green('[NUEVO]')} ${chalk.cyan(item.codigo.padEnd(12))} | ${chalk.white(item.marca.padEnd(15))} | Precio: ${chalk.green('$' + item.precio)}`);
        });
        if (data.insert.length > 10) console.log(chalk.gray(`... y ${data.insert.length - 10} productos más.`));
    }

    console.log(chalk.gray('\n----------------------------------------------\n'));
}


async function confirmUpdate(data) {
    console.log(chalk.bgRed.white.bold('\n ATENCIÓN '));
    console.log(`Se van a modificar ${chalk.bold(data.insert.length + data.update.length + data.delete.length)} registros en la base de datos de Priotti v3.`);
    
    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: '¿Está seguro de que desea sincronizar estos cambios con el servidor?',
            default: false
        }
    ]);
    return confirm;
}

async function performUpdate(data) {
    try {
        console.log(chalk.blue('\n1. Autenticando con el servidor...'));
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            numero: ADMIN_USER,
            cuit: ADMIN_CUID
        });

        const token = loginRes.data.token;
        console.log(chalk.green('✔ Autenticación exitosa.'));

        console.log(chalk.blue('2. Enviando datos masivos... (espere por favor)'));
        const res = await axios.post(`${API_URL}/import/bulk-update`, data, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status == 200) {
            console.log(chalk.bold.green('\n✅ SINCRONIZACIÓN COMPLETADA CON ÉXITO'));
            console.log(chalk.white(`Servidor: ${res.data.message}`));
            
            // Guardar registro
            const log = {
                fecha: new Date().toLocaleString(),
                detalles: res.data.details
            };
            fs.writeFileSync('./registro.json', JSON.stringify(log, null, 2));
            console.log(chalk.gray('Registro guardado en registro.json\n'));
        }
    } catch (err) {
        if (err.response) {
            console.error(chalk.red('\n❌ Error del servidor:'), err.response.data.error || err.response.statusText);
        } else {
            console.error(chalk.red('\n❌ Error de red:'), err.message);
        }
    }
}

function buildUpdateData(currentList, newList) {
    let diffList = {
        update: [],
        insert: [],
        delete: [],
        novelties: []
    };
    
    Object.keys(newList).forEach(function (key) {
        if (currentList[key] != null) {
            // Comparar si hay cambios
            if (JSON.stringify(currentList[key]) != JSON.stringify(newList[key])) {
                diffList.update.push(buildChangesOnly(currentList[key], newList[key]));
                if (newList[key].marca) diffList.novelties.push(newList[key].marca);
            }
            currentList[key].present = true;
        } else {
            // Es nuevo
            diffList.insert.push(newList[key]);
            if (newList[key].marca) diffList.novelties.push(newList[key].marca);
        }
    });

    Object.keys(currentList).forEach(function (key) {
        if (!currentList[key].present) {
            diffList.delete.push({ codigo: key });
        }
    });

    diffList.novelties = [...new Set(diffList.novelties)];
    return diffList;
}

function buildChangesOnly(oldItem, newItem) {
    let diffItem = { codigo: newItem.codigo };
    Object.keys(newItem).forEach(key => {
        // SEGURIDAD: Si el campo es 'info' y está vacío en el nuevo Excel,
        // no lo incluimos en el update para no borrar lo que ya existe en la DB.
        if (key === 'info' && !newItem[key]) return;

        if (JSON.stringify(newItem[key]) !== JSON.stringify(oldItem[key])) {
            diffItem[key] = newItem[key];
        }
    });
    return diffItem;
}

function fixCharacters(text) {
    if (!text) return "";
    return (text + '')
        .replace(/\ufffd/g, "")
        .replace(/Ñ/g, "NI")
        .replace(/'/g, "`")
        .replace(/\n/g, " ")
        .replace(/\r/g, "")
        .replace(/\t/g, "")
        .trim();
}

function buildListFromExcel(filename) {
    const workbook = XLSX.readFile(filename);
    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const json = {};

    xlData.forEach(row => {
        if (!row.arti) return;
        const codigo = (row.arti + '').trim();
        const imagen = codigo.replace(/\s+/g, '_').replace(/\//g, '-').toLowerCase();

        json[codigo] = {
            codigo: codigo,
            aplicacion: fixCharacters(row.desc),
            marca: (row.marca || '').trim(),
            rubro: fixCharacters(row.rubro),
            precio: row.precio,
            precio_oferta: row.oferta || 0,
            info: fixCharacters(buildInfo(row)),
            imagen: imagen
        };
    });
    return json;
}

function buildInfo(row) {
    let out = '';
    for (let i = 1; i <= 8; i++) {
        const val = row['memo' + i];
        if (val !== undefined) out += val;
    }
    return out;
}

main();

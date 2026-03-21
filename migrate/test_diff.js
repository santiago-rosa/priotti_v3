const XLSX = require('xlsx');

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

function buildInfo(row) {
    let out = '';
    for (let i = 1; i <= 8; i++) {
        const val = row['memo' + i];
        if (val !== undefined) out += val;
    }
    return out;
}

function buildListFromExcel(filename) {
    const workbook = XLSX.readFile(filename);
    const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    const json = {};

    xlData.forEach((row, index) => {
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

        if (row.stoc !== undefined && row.stoc !== null && row.stoc !== '') {
            const parsedStoc = parseInt(row.stoc);
            json[codigo].stock = isNaN(parsedStoc) ? 0 : parsedStoc;
        }

        if (row.smin !== undefined && row.smin !== null && row.smin !== '') {
            const parsedSmin = parseInt(row.smin);
            json[codigo].stock_low = isNaN(parsedSmin) ? 0 : parsedSmin;
        }
        
        if (row.smax !== undefined && row.smax !== null && row.smax !== '') {
            const parsedSmax = parseInt(row.smax);
            json[codigo].stock_medium = isNaN(parsedSmax) ? 0 : parsedSmax;
        }
    });
    return json;
}

const fileActual = './listas/202603211414.xls';
const fileViejo = './listas/202603211130.xls';

const actualList = buildListFromExcel(fileActual);
const viejoList = buildListFromExcel(fileViejo);

let updates = 0;
let examples = 0;

Object.keys(actualList).forEach(key => {
    if (viejoList[key]) {
        if (JSON.stringify(actualList[key]) !== JSON.stringify(viejoList[key])) {
            updates++;
            if (examples < 5) {
                console.log(`\nCambio en articulo ${key}:`);
                console.log('--- VIEJO ---');
                console.log(viejoList[key]);
                console.log('--- NUEVO ---');
                console.log(actualList[key]);
                examples++;
            }
        }
    }
});

console.log(`\nTotal de cambios detectados: ${updates}`);

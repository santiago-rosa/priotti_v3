#!/bin/bash

# ==========================================
# Cargar Configuración desde .env
# ==========================================
if [ -f php-api/.env ]; then
    export $(grep -v '^#' php-api/.env | xargs)
else
    echo "❌ Error: No se encontró el archivo php-api/.env"
    exit 1
fi

# Evaluar el parámetro pasado al comando para decidir el entorno
if [ "$1" == "live" ]; then
    echo "⚙️  Entorno: PRODUCCIÓN (LIVE)"
    FTP_HOST=$FTP_LIVE_HOST
    FTP_USER=$FTP_LIVE_USER
    FTP_PASS=$FTP_LIVE_PASS
    
    # Ajusta estas rutas a la ubicación real de producción.
    REMOTE_DIR="/"
    WEB_URL="https://felipepriotti.com.ar"
    
elif [ "$1" == "staging" ]; then
    echo "⚙️  Entorno: PRUEBAS (STAGING)"
    FTP_HOST=$FTP_STAGING_HOST
    FTP_USER=$FTP_STAGING_USER
    FTP_PASS=$FTP_STAGING_PASS
    
    # La carpeta donde queremos que aterricen los zips y el extractor
    REMOTE_DIR="/santiagorrosa"
    WEB_URL="https://felipepriotti.test.com.ar.felipepriotti.com.ar"
else
    echo "❌ Error: Debes especificar el entorno."
    echo "Uso: ./deploy-ftp.sh staging | live"
    exit 1
fi

# ==========================================
# 1. Compilar y empaquetar Frontend
# ==========================================
echo "Construyendo Frontend (React)..."
cd web
npm run build
cd dist
echo "Empaquetando Frontend en zip..."
zip -r ../../frontend.zip . > /dev/null
cd ../..

# ==========================================
# 2. Empaquetar Backend (Excluyendo basura)
# ==========================================
echo "Empaquetando Backend en zip (usando tu método clásico)..."
# Tal cual tenías en tu script original, directamente zipeamos los folders requeridos:
zip -r backend.zip php-api/public php-api/src php-api/vendor php-api/logs php-api/.env php-api/composer.json php-api/composer.lock > /dev/null

# ==========================================
# 3. Crear script mágico para extraer en el cPanel (unzip.php)
# ==========================================
echo "Generando script extractor..."
cat << 'EOF' > unzip.php
<?php
// Script de auto-extracción - Se destruirá al terminar
$errors = false;

// 1. Limpieza total (EXCEPTO carpeta 'images' y los archivos del deploy)
function full_clean($dir) {
    if (is_dir($dir)) {
        $objects = scandir($dir);
        foreach ($objects as $object) {
            if ($object == "." || $object == ".." || $object == "images" || $object == "unzip.php" || $object == "frontend.zip" || $object == "backend.zip") {
                continue;
            }
            $target = $dir . DIRECTORY_SEPARATOR . $object;
            if (is_dir($target) && !is_link($target)) {
                clean_dir($target);
                rmdir($target);
            } else {
                unlink($target);
            }
        }
    }
}

function clean_dir($dir) {
    $objects = scandir($dir);
    foreach ($objects as $object) {
        if ($object != "." && $object != "..") {
            $target = $dir . DIRECTORY_SEPARATOR . $object;
            if (is_dir($target) && !is_link($target)) {
                clean_dir($target);
                rmdir($target);
            } else {
                unlink($target);
            }
        }
    }
}

// Ejecutar limpieza
full_clean('./');

// 2. Extraer Frontend
$zip = new ZipArchive;
if ($zip->open('frontend.zip') === TRUE) {
    $zip->extractTo('./');
    $zip->close();
    unlink('frontend.zip');
    echo "✅ Frontend extraído correctamente.<br>";
} else {
    $errors = true;
    echo "❌ No se pudo abrir frontend.zip.<br>";
}

// 3. Extraer Backend
if ($zip->open('backend.zip') === TRUE) {
    // Como el backend.zip ya incluye internamente la ruta 'php-api/...', simplemente
    // lo extraemos en la raíz y sobrescribirá los archivos en su lugar correcto.
    $zip->extractTo('./');
    $zip->close();
    unlink('backend.zip');
    echo "✅ Backend extraído correctamente.<br>";
} else {
    $errors = true;
    echo "❌ No se pudo abrir backend.zip.<br>";
}

if(!$errors) {
    echo "SUCCESS";
}
// Autodestrucción del script
unlink('unzip.php');
?>
EOF

# ==========================================
# 4. Subir archivos zips y script vía lftp
# ==========================================
echo "🚀 Subiendo paquetes por FTP (¡esto será rapidísimo!)..."
# Subimos los 3 archivos individuales a la carpeta remota
lftp -c "open -u $FTP_USER,$FTP_PASS $FTP_HOST; set ftp:ssl-allow no; cd $REMOTE_DIR; put frontend.zip; put backend.zip; put unzip.php"

# ==========================================
# 5. Descomprimir en el servidor ejecutando unzip.php vía WEB
# ==========================================
echo "💥 Disparando extracción remota automática en el servidor..."
# Hacemos un llamado cURL para visitar la URL del script que extraerá todo a velocidad del disco allá
RESPONSE=$(curl -s "$WEB_URL/unzip.php")

# Limpieza local de zips temporales
rm frontend.zip backend.zip unzip.php

echo "Respuesta del servidor: $RESPONSE"
if [[ "$RESPONSE" == *"SUCCESS"* ]]; then
    echo "=========================================="
    echo "          ✅ ¡Despliegue ultra rápido finalizado!      "
    echo "=========================================="
else
    echo "=========================================="
    echo " ⚠️ Ocurrió algo inesperado al extraer. Revisa tu hosting."
    echo "=========================================="
fi

/**
 * generate-icons.mjs
 * Genera los iconos PNG en todos los tamaños requeridos por el manifest.
 * Requiere: sharp  →  npm install sharp --save-dev  (solo para este script)
 * Uso: node generate-icons.mjs
 */

import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const INPUT = resolve(__dirname, 'pokepwa_icon_source.png')
const OUTPUT_DIR = resolve(__dirname, 'public/icons')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

mkdirSync(OUTPUT_DIR, { recursive: true })

for (const size of SIZES) {
  await sharp(INPUT)
    .resize(size, size)
    .png()
    .toFile(`${OUTPUT_DIR}/icon-${size}x${size}.png`)
  console.log(`✔  icon-${size}x${size}.png`)
}

console.log('\n¡Todos los iconos generados en public/icons/!')

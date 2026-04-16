/**
 * generate-icons.mjs
 * Generates all required PWA icon sizes from LOGOSODI.png
 * Run: npm run generate-icons
 */

import sharp from 'sharp'
import { mkdir, copyFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INPUT   = join(__dirname, '../public/LOGOSODI.png')
const OUTPUT  = join(__dirname, '../public/icons')

// Standard PWA sizes
const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512]

async function main() {
  await mkdir(OUTPUT, { recursive: true })
  console.log('📁 Generating icons in public/icons/\n')

  // Standard icons (contain — no crop, off-white background)
  for (const size of SIZES) {
    await sharp(INPUT)
      .resize(size, size, { fit: 'contain', background: '#FAFAF8' })
      .png()
      .toFile(join(OUTPUT, `icon-${size}.png`))
    console.log(`  ✓ icon-${size}.png`)
  }

  // Maskable icon — logo centered in 60% safe zone with nude background padding
  const maskSize    = 512
  const contentSize = Math.round(maskSize * 0.6)   // 307px
  const pad         = Math.round((maskSize - contentSize) / 2) // 102px

  await sharp(INPUT)
    .resize(contentSize, contentSize, { fit: 'contain', background: '#FAFAF8' })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#FAFAF8' })
    .png()
    .toFile(join(OUTPUT, 'icon-512-maskable.png'))
  console.log('  ✓ icon-512-maskable.png')

  // Apple touch icon — alias of 180px
  await copyFile(join(OUTPUT, 'icon-180.png'), join(OUTPUT, 'apple-touch-icon.png'))
  console.log('  ✓ apple-touch-icon.png')

  console.log(`\n✅ ${SIZES.length + 2} icons generated successfully`)
}

main().catch((err) => {
  console.error('❌ Error generating icons:', err.message)
  process.exit(1)
})

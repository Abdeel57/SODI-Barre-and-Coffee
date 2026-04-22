/**
 * ─── CONFIGURACIÓN MANUAL DE MARCOS DE TIER ───────────────────────────────────
 *
 * Ajusta los valores de cada tier para que el marco se vea correcto.
 *
 * CÓMO FUNCIONA:
 *   - La foto siempre llena el círculo completo.
 *   - El PNG del marco se coloca encima de la foto.
 *   - `overhang`  → cuántos px sale el marco MÁS ALLÁ del borde de la foto.
 *                   Sube este valor si el marco se ve "dentro" de la foto.
 *                   Bájalo si el marco cubre demasiado la cara.
 *   - `opacity`   → transparencia del marco sobre la foto (0 = invisible, 1 = sólido).
 *                   Sube si el marco se ve muy tenue.
 *   - `scale`     → multiplica el tamaño total del PNG (1.0 = tamaño original).
 *                   Úsalo como ajuste fino si overhang no es suficiente.
 *
 * WORKFLOW PARA AJUSTAR:
 *   1. Abre este archivo
 *   2. Cambia el número que quieras
 *   3. Guarda → el navegador se recarga automáticamente (Vite HMR)
 *   4. Cuando quedes conforme → git commit + push para subir a producción
 */

export interface TierFrameConfig {
  overhang: number   // px que el PNG sale más allá del borde de la foto
  opacity:  number   // opacidad del PNG encima de la foto (0–1)
  scale:    number   // escala adicional del PNG (1.0 = sin cambio)
}

export const TIER_FRAME_CONFIG: Record<string, TierFrameConfig> = {
  plie: {
    overhang: 6,      // ← EDITA ESTE NÚMERO
    opacity:  1,
    scale:    1.0,
  },
  arabesque: {
    overhang: 6,      // ← EDITA ESTE NÚMERO
    opacity:  1,
    scale:    1.0,
  },
  attitude: {
    overhang: 4,      // ← EDITA ESTE NÚMERO
    opacity:  1,
    scale:    1.0,
  },
  prima: {
    overhang: 2,      // ← EDITA ESTE NÚMERO
    opacity:  1,
    scale:    1.0,
  },
}

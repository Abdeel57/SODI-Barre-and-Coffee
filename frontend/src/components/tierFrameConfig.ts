/**
 * ─── CONFIGURACIÓN DE MARCOS DE TIER ─────────────────────────────────────────
 * Edita en /dev-frames: arrastra el marco, ajusta los sliders y pulsa Guardar.
 *
 * scale   → tamaño del PNG vs la foto  (1.0 = igual, 1.3 = 30% más grande)
 * offsetX → posición horizontal en px  (+ derecha / - izquierda)
 * offsetY → posición vertical en px    (+ abajo   / - arriba)
 */

export interface TierFrameConfig {
  scale:   number
  offsetX: number
  offsetY: number
}

export const TIER_FRAME_CONFIG: Record<string, TierFrameConfig> = {
  plie: {
    scale:   1.52,
    offsetX: -8,
    offsetY: 9,
  },
  arabesque: {
    scale:   1.36,
    offsetX: -2,
    offsetY: 6,
  },
  attitude: {
    scale:   1.37,
    offsetX: -2,
    offsetY: 6,
  },
  prima: {
    scale:   1.28,
    offsetX: 0,
    offsetY: 0,
  },
}

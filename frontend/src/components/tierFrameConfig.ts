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
    scale:   1.51,
    offsetX: -7,
    offsetY: 9,
  },
  arabesque: {
    scale:   1.35,
    offsetX: -3,
    offsetY: 5,
  },
  attitude: {
    scale:   1.41,
    offsetX: -3,
    offsetY: 7,
  },
  prima: {
    scale:   1.29,
    offsetX: 0,
    offsetY: 0,
  },
}

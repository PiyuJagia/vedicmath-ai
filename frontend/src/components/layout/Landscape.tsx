import styles from './Landscape.module.css'

/**
 * Soft hills behind the page content. A placeholder for the watercolour
 * landscape art in the approved designs; purely decorative.
 */
export function Landscape() {
  return (
    <div className={styles.landscape} aria-hidden="true">
      <svg viewBox="0 0 1440 260" preserveAspectRatio="none" focusable="false">
        <path className={styles.far} d="M0 150 C180 70 300 110 430 80 C560 50 640 120 780 95 C930 68 1040 20 1180 60 C1300 92 1380 70 1440 80 V260 H0 Z" />
        <path className={styles.mid} d="M0 190 C160 150 280 175 420 160 C600 140 700 190 880 172 C1040 156 1170 128 1300 150 C1370 162 1410 158 1440 152 V260 H0 Z" />
        <path className={styles.near} d="M0 228 C220 206 400 222 640 214 C860 206 1060 232 1260 220 C1350 214 1410 218 1440 216 V260 H0 Z" />
      </svg>
    </div>
  )
}

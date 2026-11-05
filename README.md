# Reproductor En Vivo - Hits 20 (YouTube Popup)

Ventana reproductora de transmisiones en vivo de YouTube al 100% de pantalla, con cartel de "EN VIVO", logo flotante, pasarela de texto inferior y **Panel de Administración integrado** con previsualización en tiempo real y navegación por pestañas compactas.

---

## 🔐 Panel de Administración

El botón para administrar **es el propio cartel "EN VIVO"**:

1. Haz clic sobre el cuadro rojo **"EN VIVO"** (arriba a la izquierda).
2. Se abrirá la ventana emergente de autenticación:
   * **Usuario:** `hit20`
   * **Contraseña:** `online.com`
   *(Las credenciales están protegidas internamente mediante funciones criptográficas SHA-256; no están visibles en el código fuente ni en el HTML).*
3. Una vez ingresado, el **Panel de Control** cuenta con pestañas de navegación rápida:
   * **📺 Video:** Modifica la URL o ID del canal / emisión de YouTube.
   * **🖼️ Logo:** Ancho, alto, escala y posición (Top / Right) con vista previa en vivo.
   * **🔴 En Vivo:** Escala y posición (Top / Left) del cartel rojo.
   * **📢 Ticker:**
     * **Texto en Movimiento:** Edita las noticias y enlaces que corren por la pantalla.
     * **Tamaño Letra:** Control deslizante para el tamaño de la tipografía (en px).
     * **Alto Fondo:** Control deslizante para el grosor / altura de la barra azul (en px).
     * **Velocidad:** Segundos que tarda en recorrer la pantalla.
   * **👁️ Ver Todo:** Muestra todas las secciones juntas con barra de desplazamiento interna compacta.
4. **Guardar Cambios:** Guarda las preferencias en tu navegador (`localStorage`).
5. **Restablecer:** Vuelve a los valores predeterminados de fábrica.

> **Atajo de teclado alternativo:** Presiona `Ctrl + Shift + A` para abrir el panel de administración.

---

## 📁 Estructura del Proyecto

```text
├── hit.png             # Logo de Hits 20 (ubicado arriba a la derecha)
├── index.html          # Estructura semántica HTML con modales de administración y pestañas
├── main.js             # Lógica del reproductor, autenticación SHA-256 y panel interactivo
├── player.css          # Estilos bajo metodología BEM para el reproductor y panel
├── player.module.css   # Estilos modulares idénticos (para entornos que requieran .module.css)
├── variables.css       # Variables globales de diseño y tamaños por defecto
└── README.md           # Guía de uso y administración
```

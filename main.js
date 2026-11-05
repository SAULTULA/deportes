/**
 * ==============================================================================
 * REPRODUCTOR HITS 20 - LÓGICA PRINCIPAL Y PANEL DE ADMINISTRACIÓN
 * ==============================================================================
 */

// Configuración predeterminada inicial
const DEFAULT_CONFIG = {
  youtubeUrl: 'https://www.youtube.com/watch?v=P-042o1mzn0',
  logoWidth: 30,
  logoHeight: 20,
  logoScale: 1,
  logoTop: 15,
  logoRight: 15,
  liveBadgeScale: 1,
  liveBadgeTop: 15,
  liveBadgeLeft: 15,
  tickerText: '*** www.hits20radioonline.com.ar el portal de noticias de hits20 *** www.hits20radioonline.com la web de musica y noticias de hits20 *** www.ksmservicios.com.ar creacion web servicio para radios aplicaciones web y android ***',
  tickerSpeed: 25,
  tickerFontSize: 14,
  tickerHeight: 38
};

const STORAGE_KEY = 'hits20_live_config';
const AUTH_SESSION_KEY = 'hits20_admin_auth';

// Hashes criptográficos SHA-256 (usuario y contraseña protegidos)
const HASH_AUTH_USER = '4dc9b3b338eddb5fdd567fefd0f77cb8060976af3fe3dce63ca490e12b5d9bd2';
const HASH_AUTH_PASS = '37c2028b3df0df9a8688a73d6c2045b2c97ade8e2a05ca7fb310d4932b91e20a';

/**
 * Genera hash SHA-256 de una cadena de texto
 */
async function computeSha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extrae el ID de video de YouTube de cualquier formato común de URL
 */
function extractYouTubeId(url) {
  if (!url) return '';
  const trimmed = url.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/i
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return trimmed;
}

/**
 * Obtiene la configuración actual (desde localStorage o por defecto)
 */
function getActiveConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('No se pudo leer localStorage:', e);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Aplica los valores de configuración a las variables CSS y al DOM
 */
function applyConfig(config, updateVideo = true) {
  const root = document.documentElement;

  // Variables CSS del Logo
  root.style.setProperty('--logo-width', `${config.logoWidth}px`);
  root.style.setProperty('--logo-height', `${config.logoHeight}px`);
  root.style.setProperty('--logo-scale', config.logoScale);
  root.style.setProperty('--logo-top', `${config.logoTop}px`);
  root.style.setProperty('--logo-right', `${config.logoRight}px`);

  // Variables CSS del Cartel "EN VIVO"
  root.style.setProperty('--live-badge-scale', config.liveBadgeScale);
  root.style.setProperty('--live-badge-top', `${config.liveBadgeTop}px`);
  root.style.setProperty('--live-badge-left', `${config.liveBadgeLeft}px`);

  // Variables CSS del Ticker (Velocidad, Tamaño de letra y Alto de fondo)
  root.style.setProperty('--ticker-speed', `${config.tickerSpeed}s`);
  root.style.setProperty('--ticker-font-size', `${config.tickerFontSize}px`);
  root.style.setProperty('--ticker-height', `${config.tickerHeight}px`);

  // Texto del Ticker
  const tickerElements = document.querySelectorAll('.player__ticker-text');
  tickerElements.forEach(el => {
    el.textContent = config.tickerText;
  });

  // URL del reproductor de video
  if (updateVideo) {
    const iframe = document.getElementById('youtube-player');
    if (iframe) {
      const urlParams = new URLSearchParams(window.location.search);
      const queryVideo = urlParams.get('v') || urlParams.get('url');
      const targetUrl = queryVideo ? decodeURIComponent(queryVideo) : config.youtubeUrl;
      const videoId = extractYouTubeId(targetUrl);

      const embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      if (iframe.getAttribute('src') !== embedSrc) {
        iframe.setAttribute('src', embedSrc);
      }
    }
  }
}

/**
 * Inicializa y enlaza todos los eventos del panel de administración
 */
function setupAdminPanel() {
  const triggerBtn = document.getElementById('btn-admin-trigger');
  const loginModal = document.getElementById('admin-login-modal');
  const panelModal = document.getElementById('admin-panel-modal');

  const loginForm = document.getElementById('admin-login-form');
  const loginUser = document.getElementById('admin-user');
  const loginPass = document.getElementById('admin-pass');
  const loginAlert = document.getElementById('admin-login-alert');

  const panelForm = document.getElementById('admin-panel-form');
  const panelAlert = document.getElementById('admin-panel-alert');

  // Inputs del panel
  const inputYoutube = document.getElementById('cfg-youtube-url');
  
  const inputLogoWidth = document.getElementById('cfg-logo-width');
  const inputLogoHeight = document.getElementById('cfg-logo-height');
  const inputLogoScale = document.getElementById('cfg-logo-scale');
  const inputLogoTop = document.getElementById('cfg-logo-top');
  const inputLogoRight = document.getElementById('cfg-logo-right');

  const inputBadgeScale = document.getElementById('cfg-badge-scale');
  const inputBadgeTop = document.getElementById('cfg-badge-top');
  const inputBadgeLeft = document.getElementById('cfg-badge-left');

  const inputTickerText = document.getElementById('cfg-ticker-text');
  const inputTickerSpeed = document.getElementById('cfg-ticker-speed');
  const inputTickerFontSize = document.getElementById('cfg-ticker-font-size');
  const inputTickerHeight = document.getElementById('cfg-ticker-height');

  const btnReset = document.getElementById('btn-admin-reset');
  const btnLogout = document.getElementById('btn-admin-logout');

  // Control de pestañas para vista compacta
  const tabs = document.querySelectorAll('.admin__tab');
  const sections = document.querySelectorAll('[data-tab-section]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('admin__tab--active'));
      tab.classList.add('admin__tab--active');

      const selectedTab = tab.getAttribute('data-tab');
      sections.forEach(sec => {
        const secCat = sec.getAttribute('data-tab-section');
        if (selectedTab === 'all' || selectedTab === secCat) {
          sec.classList.remove('admin__section--hidden');
        } else {
          sec.classList.add('admin__section--hidden');
        }
      });
    });
  });

  // Cierra cualquier modal abierto
  function closeAllModals() {
    loginModal.classList.remove('admin--open');
    panelModal.classList.remove('admin--open');
    loginAlert.classList.remove('admin__alert--visible');
    panelAlert.classList.remove('admin__alert--visible');
  }

  // Verifica si el usuario ya inició sesión
  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  }

  // Abre el modal correspondiente al hacer clic en el cartel "EN VIVO"
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => {
      if (isAuthenticated()) {
        openPanel();
      } else {
        openLogin();
      }
    });
  }

  // Atajo de teclado adicional (Ctrl + Shift + A)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      if (isAuthenticated()) {
        openPanel();
      } else {
        openLogin();
      }
    }
  });

  function openLogin() {
    closeAllModals();
    loginUser.value = '';
    loginPass.value = '';
    loginModal.classList.add('admin--open');
    loginUser.focus();
  }

  function openPanel() {
    closeAllModals();
    syncFormWithCurrentConfig();
    panelModal.classList.add('admin--open');
  }

  // Rellena los campos del formulario con la configuración activa
  function syncFormWithCurrentConfig() {
    const config = getActiveConfig();

    inputYoutube.value = config.youtubeUrl;

    inputLogoWidth.value = config.logoWidth;
    inputLogoHeight.value = config.logoHeight;
    inputLogoScale.value = config.logoScale;
    inputLogoTop.value = config.logoTop;
    inputLogoRight.value = config.logoRight;

    inputBadgeScale.value = config.liveBadgeScale;
    inputBadgeTop.value = config.liveBadgeTop;
    inputBadgeLeft.value = config.liveBadgeLeft;

    inputTickerText.value = config.tickerText;
    inputTickerSpeed.value = config.tickerSpeed;
    inputTickerFontSize.value = config.tickerFontSize || DEFAULT_CONFIG.tickerFontSize;
    inputTickerHeight.value = config.tickerHeight || DEFAULT_CONFIG.tickerHeight;

    updateLabelBadges();
  }

  // Actualiza los textos de valor junto a cada slider
  function updateLabelBadges() {
    document.querySelectorAll('[data-bind-label]').forEach(badge => {
      const targetId = badge.getAttribute('data-bind-label');
      const input = document.getElementById(targetId);
      const unit = badge.getAttribute('data-unit') || '';
      if (input) {
        badge.textContent = `${input.value}${unit}`;
      }
    });
  }

  // Recolecta los valores del formulario
  function collectFormValues() {
    return {
      youtubeUrl: inputYoutube.value.trim() || DEFAULT_CONFIG.youtubeUrl,
      logoWidth: parseInt(inputLogoWidth.value, 10) || DEFAULT_CONFIG.logoWidth,
      logoHeight: parseInt(inputLogoHeight.value, 10) || DEFAULT_CONFIG.logoHeight,
      logoScale: parseFloat(inputLogoScale.value) || DEFAULT_CONFIG.logoScale,
      logoTop: parseInt(inputLogoTop.value, 10) || 0,
      logoRight: parseInt(inputLogoRight.value, 10) || 0,
      liveBadgeScale: parseFloat(inputBadgeScale.value) || DEFAULT_CONFIG.liveBadgeScale,
      liveBadgeTop: parseInt(inputBadgeTop.value, 10) || 0,
      liveBadgeLeft: parseInt(inputBadgeLeft.value, 10) || 0,
      tickerText: inputTickerText.value.trim() || DEFAULT_CONFIG.tickerText,
      tickerSpeed: parseInt(inputTickerSpeed.value, 10) || DEFAULT_CONFIG.tickerSpeed,
      tickerFontSize: parseInt(inputTickerFontSize.value, 10) || DEFAULT_CONFIG.tickerFontSize,
      tickerHeight: parseInt(inputTickerHeight.value, 10) || DEFAULT_CONFIG.tickerHeight
    };
  }

  // Previsualización en TIEMPO REAL al mover cualquier slider o campo
  panelForm.addEventListener('input', () => {
    updateLabelBadges();
    const liveValues = collectFormValues();
    applyConfig(liveValues, false);
  });

  // Procesar Login con verificación SHA-256
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.classList.remove('admin__alert--visible');

    const enteredUser = loginUser.value;
    const enteredPass = loginPass.value;

    const hashUser = await computeSha256(enteredUser);
    const hashPass = await computeSha256(enteredPass);

    if (hashUser === HASH_AUTH_USER && hashPass === HASH_AUTH_PASS) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      openPanel();
    } else {
      loginAlert.textContent = 'Credenciales no válidas. Intente nuevamente.';
      loginAlert.className = 'admin__alert admin__alert--error admin__alert--visible';
    }
  });

  // Guardar Cambios en localStorage
  panelForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedConfig = collectFormValues();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
      applyConfig(updatedConfig, true);

      panelAlert.textContent = '¡Configuración guardada exitosamente!';
      panelAlert.className = 'admin__alert admin__alert--success admin__alert--visible';

      setTimeout(() => {
        panelAlert.classList.remove('admin__alert--visible');
      }, 3000);
    } catch (err) {
      panelAlert.textContent = 'Error al guardar en el almacenamiento local.';
      panelAlert.className = 'admin__alert admin__alert--error admin__alert--visible';
    }
  });

  // Restablecer por defecto
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('¿Desea restablecer todos los valores originales?')) {
        localStorage.removeItem(STORAGE_KEY);
        applyConfig(DEFAULT_CONFIG, true);
        syncFormWithCurrentConfig();

        panelAlert.textContent = 'Valores restablecidos a los predeterminados.';
        panelAlert.className = 'admin__alert admin__alert--success admin__alert--visible';

        setTimeout(() => {
          panelAlert.classList.remove('admin__alert--visible');
        }, 2500);
      }
    });
  }

  // Cerrar sesión
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      closeAllModals();
    });
  }

  // Botones de cierre [X] y clics en el backdrop
  document.querySelectorAll('[data-close-admin]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  document.querySelectorAll('.admin__backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', closeAllModals);
  });
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const config = getActiveConfig();
  applyConfig(config, true);
  setupAdminPanel();
});

/**
 * ==============================================================================
 * REPRODUCTOR HITS 20 - LÓGICA PRINCIPAL, PANEL Y SINCRONIZACIÓN CON GOOGLE SHEETS
 * ==============================================================================
 */

// Configuración predeterminada base
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
  tickerHeight: 38,
  // URL de la aplicación web de Google Sheets (Google Apps Script)
  sheetUrl: 'https://script.google.com/macros/s/AKfycbwVt-dNZNFpz2vKHicUPiKdo3opuE391BifPqf53TZMBtm4p-Dp2OQH-mDHDvH88RNz/exec'
};

const STORAGE_KEY = 'hits20_live_config';
const AUTH_SESSION_KEY = 'hits20_admin_auth';

// Hashes criptográficos SHA-256 (usuario y contraseña protegidos)
const HASH_AUTH_USER = '4dc9b3b338eddb5fdd567fefd0f77cb8060976af3fe3dce63ca490e12b5d9bd2';
const HASH_AUTH_PASS = '37c2028b3df0df9a8688a73d6c2045b2c97ade8e2a05ca7fb310d4932b91e20a';

// Estado en memoria de la configuración activa
let currentActiveConfig = { ...DEFAULT_CONFIG };

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
 * Obtiene la configuración local almacenada en caché
 */
function getLocalConfig() {
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
 * Descarga la configuración global desde Google Sheets (Apps Script Web App)
 */
async function fetchSheetConfig(url) {
  const targetUrl = (url || currentActiveConfig.sheetUrl || '').trim();
  if (!targetUrl || !targetUrl.startsWith('http')) return null;

  try {
    const response = await fetch(targetUrl, { cache: 'no-cache' });
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        return data;
      }
    }
  } catch (err) {
    // Si la hoja no está disponible o no hay red, sigue con la configuración local
  }
  return null;
}

/**
 * Guarda la configuración en Google Sheets mediante Apps Script
 */
async function saveSheetConfig(url, config) {
  const targetUrl = (url || '').trim();
  if (!targetUrl || !targetUrl.startsWith('http')) return false;

  try {
    // Usamos text/plain para evitar bloqueos de preflight OPTIONS en Google Apps Script
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(config)
    });
    return response.ok;
  } catch (err) {
    // En caso de que el navegador bloquee la lectura de la respuesta redirigida de Apps Script,
    // intentamos enviar con mode no-cors para asegurar que el POST llegue y actualice la hoja
    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(config)
      });
      return true;
    } catch (err2) {
      console.error('Error al guardar en Google Sheets:', err2);
      return false;
    }
  }
}

/**
 * Aplica los valores de configuración a las variables CSS y al DOM
 */
function applyConfig(config, updateVideo = true) {
  currentActiveConfig = { ...config };
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
    if (el.textContent !== config.tickerText) {
      el.textContent = config.tickerText;
    }
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

  const inputSheetUrl = document.getElementById('cfg-sheet-url');
  const sheetDot = document.getElementById('admin-sheet-dot');
  const sheetText = document.getElementById('admin-sheet-text');

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
    checkSheetConnection();
    panelModal.classList.add('admin--open');
  }

  // Comprueba el estado de la conexión a Google Sheets
  async function checkSheetConnection() {
    const url = inputSheetUrl.value.trim();
    if (!url) {
      setSheetStatus(null, 'Modo Local (Pega la URL de tu Google Sheet para sincronizar a todos los usuarios)');
      return;
    }

    setSheetStatus(null, 'Verificando conexión con Google Sheets...');
    const data = await fetchSheetConfig(url);
    if (data !== null) {
      setSheetStatus(true, 'Conectado a Google Sheets (Sincronización global activa)');
    } else {
      setSheetStatus(false, 'No se pudo conectar a Google Sheets (Verifica la URL o permisos)');
    }
  }

  function setSheetStatus(isOnline, message) {
    if (!sheetDot || !sheetText) return;
    sheetDot.className = 'admin__status-dot';
    if (isOnline === true) {
      sheetDot.classList.add('admin__status-dot--online');
    } else if (isOnline === false) {
      sheetDot.classList.add('admin__status-dot--offline');
    }
    sheetText.textContent = message;
  }

  // Rellena los campos del formulario con la configuración activa
  function syncFormWithCurrentConfig() {
    const config = currentActiveConfig;

    inputYoutube.value = config.youtubeUrl || DEFAULT_CONFIG.youtubeUrl;

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

    inputSheetUrl.value = config.sheetUrl || DEFAULT_CONFIG.sheetUrl;

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
      tickerHeight: parseInt(inputTickerHeight.value, 10) || DEFAULT_CONFIG.tickerHeight,
      sheetUrl: inputSheetUrl.value.trim() || DEFAULT_CONFIG.sheetUrl
    };
  }

  // Previsualización en TIEMPO REAL al mover cualquier slider o campo
  panelForm.addEventListener('input', () => {
    updateLabelBadges();
    const liveValues = collectFormValues();
    applyConfig(liveValues, false);
  });

  inputSheetUrl.addEventListener('change', checkSheetConnection);

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

  // Guardar Cambios: Actualiza localmente y en Google Sheets para todos los usuarios
  panelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updatedConfig = collectFormValues();

    // 1. Guardar en almacenamiento local
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
      applyConfig(updatedConfig, true);
    } catch (err) {
      console.warn('Error en localStorage:', err);
    }

    if (updatedConfig.sheetUrl) {
      panelAlert.textContent = 'Guardando cambios en Google Sheets...';
      panelAlert.className = 'admin__alert admin__alert--visible';

      const savedSheet = await saveSheetConfig(updatedConfig.sheetUrl, updatedConfig);

      if (savedSheet) {
        panelAlert.textContent = '¡Guardado global en Google Sheets exitoso! Todos los usuarios verán los cambios.';
        panelAlert.className = 'admin__alert admin__alert--success admin__alert--visible';
        setSheetStatus(true, 'Conectado a Google Sheets (Sincronización global activa)');
      } else {
        panelAlert.textContent = 'Guardado localmente. No se pudo actualizar el Sheet (Verifica la URL de Apps Script).';
        panelAlert.className = 'admin__alert admin__alert--error admin__alert--visible';
        setSheetStatus(false, 'Error al subir a Google Sheets');
      }
    } else {
      panelAlert.textContent = 'Guardado localmente. Si quieres que lo vean todos los usuarios, pega la URL de tu Google Sheet en la pestaña "Google Sheets".';
      panelAlert.className = 'admin__alert admin__alert--success admin__alert--visible';
      setSheetStatus(null, 'Modo Local');
    }

    setTimeout(() => {
      panelAlert.classList.remove('admin__alert--visible');
    }, 4500);
  });

  // Restablecer por defecto
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (confirm('¿Desea restablecer todos los valores originales en este equipo y en Google Sheets?')) {
        localStorage.removeItem(STORAGE_KEY);
        applyConfig(DEFAULT_CONFIG, true);
        syncFormWithCurrentConfig();

        if (DEFAULT_CONFIG.sheetUrl) {
          await saveSheetConfig(DEFAULT_CONFIG.sheetUrl, DEFAULT_CONFIG);
        }

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

/**
 * Sincroniza periódicamente con Google Sheets para que cualquier usuario conectado
 * reciba cambios en vivo sin necesidad de recargar la página
 */
async function syncGlobalWithSheet() {
  if (!currentActiveConfig.sheetUrl) return;

  const sheetData = await fetchSheetConfig(currentActiveConfig.sheetUrl);
  if (sheetData && typeof sheetData === 'object') {
    const hasChanges = JSON.stringify(sheetData) !== JSON.stringify(currentActiveConfig);
    if (hasChanges) {
      applyConfig({ ...currentActiveConfig, ...sheetData }, true);
    }
  }
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cargar primero de caché local / predeterminados para visualización inmediata
  const localConfig = getLocalConfig();
  applyConfig(localConfig, true);
  setupAdminPanel();

  // 2. Descargar la configuración global de Google Sheets en segundo plano
  await syncGlobalWithSheet();

  // 3. Revisar cada 20 segundos si el administrador hizo un cambio en vivo
  setInterval(syncGlobalWithSheet, 20000);
});

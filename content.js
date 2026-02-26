(function() {
    const BUTTON_ID = "btn-download-yt-pro";
    const LOCAL_BACKEND_URL = "http://localhost:3000/download";
    const HEALTH_CHECK_URL = "http://localhost:3000/"; // URL para verificar si el server está vivo
    
    let abortController = null;

    /**
     * Verifica si el servidor local está activo antes de proceder
     */
    async function isBackendAlive() {
        try {
            // Hacemos una petición corta para ver si el servidor responde
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            await fetch(HEALTH_CHECK_URL, { 
                mode: 'no-cors', 
                signal: controller.signal 
            });
            
            clearTimeout(timeoutId);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Fuerza la descarga del archivo asegurando la interacción con el DOM.
     * Se usa la URL directa del backend para evitar errores de parseo JSON.
     */
    function triggerDownload(videoId) {
        try {
            const downloadUrl = `${LOCAL_BACKEND_URL}?videoId=${videoId}`;
            
            // Creamos un enlace invisible
            const a = document.createElement('a');
            a.href = downloadUrl;
            
            // Atributo download para sugerir al navegador que guarde el archivo
            a.download = `video-${videoId}.mp4`;
            
            // Forzamos que se abra en la misma ventana para que el navegador gestione el flujo de descarga
            a.target = '_self'; 
            a.style.display = 'none';
            document.body.appendChild(a);
            
            // Disparamos el click
            a.click();
            
            // Limpieza del DOM
            setTimeout(() => {
                if (document.body.contains(a)) document.body.removeChild(a);
            }, 1000);
            
            return true;
        } catch (e) {
            console.error("[YT Downloader] Error al disparar descarga:", e);
            return false;
        }
    }

    function injectDownloadButton() {
        if (!window.location.pathname.includes('/watch')) return;
        if (document.getElementById(BUTTON_ID)) return;

        // Selectores comunes para el área de acciones de YouTube
        const selectors = [
            "ytd-watch-metadata #actions.ytd-watch-metadata #top-level-buttons-computed",
            "ytd-watch-metadata #actions-inner #menu ytd-menu-renderer",
            "#owner #subscribe-button",
            ".ytd-watch-metadata #actions"
        ];

        let targetContainer = null;
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.isConnected && el.offsetHeight > 0) {
                targetContainer = el;
                break;
            }
        }

        if (targetContainer) {
            const btn = document.createElement("button");
            btn.id = BUTTON_ID;
            btn.className = "yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m";
            btn.style.marginLeft = "8px";
            btn.style.borderRadius = "18px";
            btn.style.border = "none";
            btn.style.cursor = "pointer";
            btn.style.position = "relative";
            
            const updateUI = (text, icon) => {
                btn.innerHTML = `
                    <div style="display: flex; align-items: center; padding: 0 12px; height: 36px;">
                        <span style="margin-right: 6px; font-size: 16px;">${icon}</span>
                        <span style="font-weight: 500; font-size: 14px; font-family: Roboto, Arial, sans-serif;">${text}</span>
                    </div>
                `;
            };

            const resetBtn = () => {
                btn.disabled = false;
                btn.style.opacity = "1";
                updateUI("Descargar", "💻");
            };

            updateUI("Descargar", "💻");

            btn.onclick = async (e) => {
                const videoId = new URLSearchParams(window.location.search).get("v");
                if (!videoId) return;

                // Bloqueamos temporalmente para evitar doble click
                btn.disabled = true;
                btn.style.opacity = "0.8";
                updateUI("Verificando...", "⏳");

                // Verificamos si el servidor está encendido
                const isAlive = await isBackendAlive();

                if (!isAlive) {
                    updateUI("Iniciar servicio primero", "⚠️");
                    setTimeout(resetBtn, 4000);
                    return;
                }

                updateUI("Enviando...", "🚀");

                // Ejecutamos la descarga directa
                const success = triggerDownload(videoId);
                
                if (success) {
                    // Esperamos un tiempo prudencial antes de permitir otro click
                    setTimeout(resetBtn, 5000);
                } else {
                    updateUI("Error", "❌");
                    setTimeout(resetBtn, 3000);
                }
            };

            targetContainer.appendChild(btn);
        }
    }

    // Observador para manejar la navegación interna de YouTube (SPA)
    const observer = new MutationObserver(() => {
        if (!document.getElementById(BUTTON_ID)) {
            injectDownloadButton();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    // Inyección inicial
    setTimeout(injectDownloadButton, 2000);
})();
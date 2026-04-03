let initialized = false;
let deferredPrompt = null;
let installed =
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true);

const listeners = new Set();

function emitState() {
  const nextState = {
    promptEvent: deferredPrompt,
    isInstalled: installed,
  };

  listeners.forEach((listener) => listener(nextState));
}

export function setupInstallPromptListeners() {
  if (initialized || typeof window === "undefined") return;

  initialized = true;
  const displayModeQuery = window.matchMedia("(display-mode: standalone)");

  const syncInstalledState = () => {
    installed = displayModeQuery.matches || window.navigator.standalone === true;
    emitState();
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installed = false;
    emitState();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    emitState();
  });

  if (typeof displayModeQuery.addEventListener === "function") {
    displayModeQuery.addEventListener("change", syncInstalledState);
  } else if (typeof displayModeQuery.addListener === "function") {
    displayModeQuery.addListener(syncInstalledState);
  }
}

export function getInstallPromptState() {
  return {
    promptEvent: deferredPrompt,
    isInstalled: installed,
  };
}

export function clearInstallPromptEvent() {
  deferredPrompt = null;
  emitState();
}

export function subscribeInstallPrompt(listener) {
  listeners.add(listener);
  listener(getInstallPromptState());

  return () => {
    listeners.delete(listener);
  };
}

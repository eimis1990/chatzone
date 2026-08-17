const METAMASK_EXTENSION_ID = 'nkbihfbeogaeaoehlefnkodbefgpgknn'

export function isKnownMetaMaskConnectionError(value: unknown, filename = ''): boolean {
  const error = value && typeof value === 'object' ? value as { message?: unknown; stack?: unknown } : null
  const message = typeof error?.message === 'string' ? error.message : String(value ?? '')
  const stack = typeof error?.stack === 'string' ? error.stack : ''
  const source = `${stack}\n${filename}`

  return message === 'Failed to connect to MetaMask' && source.includes(METAMASK_EXTENSION_ID)
}

/**
 * Chrome extensions run in the page's JavaScript world. MetaMask can reject its
 * own background-port connection during an extension reload/update; Next dev's
 * global rejection listener otherwise presents that third-party failure as an
 * app runtime issue. This capture listener stops only the exact MetaMask error.
 */
export const METAMASK_DEV_OVERLAY_GUARD_SCRIPT = `(() => {
  if (window.__loqaraMetaMaskErrorGuardInstalled) return;
  window.__loqaraMetaMaskErrorGuardInstalled = true;

  const extensionId = '${METAMASK_EXTENSION_ID}';
  const handle = (event) => {
    const value = 'reason' in event ? event.reason : event.error;
    const message = value && typeof value.message === 'string' ? value.message : String(value || '');
    const stack = value && typeof value.stack === 'string' ? value.stack : '';
    const filename = typeof event.filename === 'string' ? event.filename : '';

    if (message !== 'Failed to connect to MetaMask') return;
    if (!(stack + '\\n' + filename).includes(extensionId)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  window.addEventListener('error', handle, { capture: true });
  window.addEventListener('unhandledrejection', handle, { capture: true });
})();`

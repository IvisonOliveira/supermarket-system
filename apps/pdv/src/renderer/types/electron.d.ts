import type { ElectronAPI } from '@shared/ipc-channels';

/**
 * Augmenta a interface global Window com a API IPC exposta pelo preload.
 * Disponível em todo o código do renderer como `window.electronAPI`.
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

import { app, WebContents } from 'electron';
import { IPC } from '../shared/ipc-channels';

export function initBarcodeDetector() {
  app.on('web-contents-created', (_event, webContents: WebContents) => {
    let barcodeBuffer = '';
    let firstKeyTime = 0;

    // before-input-event captura eventos de teclado independente do elemento focado
    webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown') {
        if (barcodeBuffer.length === 0) {
          firstKeyTime = Date.now();
        }

        if (input.key === 'Enter') {
          const totalTime = Date.now() - firstKeyTime;
          
          // Verifica se é scanner: >= 8 caracteres em menos de 100ms
          const isScanner = barcodeBuffer.length >= 8 && totalTime <= 100;
          
          if (barcodeBuffer.length > 0) {
            // Envia o código para o renderer
            webContents.send(IPC.BARCODE_SCANNED, {
              code: barcodeBuffer,
              isScanner
            });
          }
          
          barcodeBuffer = '';
        } else if (input.key.length === 1) { 
          barcodeBuffer += input.key;
        }
      }
    });
  });
}

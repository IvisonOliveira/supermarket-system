import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

export class ScaleReader {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private onWeightCallback: ((weight: number) => void) | null = null;

  connect(portPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.disconnect(); // Garante que a porta anterior seja fechada

      this.port = new SerialPort({ path: portPath, baudRate: 9600 }, (err) => {
        if (err) {
          console.error(`Erro ao abrir porta serial da balança (${portPath}):`, err.message);
          return resolve(false);
        }

        this.parser = this.port!.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        
        this.parser.on('data', (data: string) => {
          // Protocolo Toledo: P+NNNNN, onde NNNNN é o peso em gramas
          if (data.startsWith('P+')) {
            const gramString = data.substring(2, 7);
            const grams = parseInt(gramString, 10);
            if (!isNaN(grams)) {
              const kg = grams / 1000;
              if (this.onWeightCallback) {
                this.onWeightCallback(kg);
              }
            }
          }
        });

        resolve(true);
      });
    });
  }

  disconnect() {
    if (this.port?.isOpen) {
      this.port.close();
    }
    this.port = null;
    this.parser = null;
  }

  onWeight(callback: (weight: number) => void) {
    this.onWeightCallback = callback;
  }
}

export const scaleReader = new ScaleReader();

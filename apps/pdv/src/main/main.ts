import path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { registerIpcHandlers } from './ipc-handlers';
import { startSyncService } from './sync-service';
import { initAuthHandlers } from './auth';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app
  .whenReady()
  .then(() => {
    initAuthHandlers();
    registerIpcHandlers(ipcMain);
    createWindow();
    startSyncService();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch(console.error);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

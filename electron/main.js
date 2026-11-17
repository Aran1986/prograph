const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) {
  app.quit();
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/icon.ico')
  });

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    process.env.NODE_ENV = 'production';
    require(path.join(__dirname, '../dist/server.cjs'));
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000');
    }, 500);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
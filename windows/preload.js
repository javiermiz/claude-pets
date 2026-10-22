const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pets', {
  onState: (cb) => ipcRenderer.on('state', (_, s) => cb(s)),
  mouse: (inside) => ipcRenderer.send('mouse', inside),
  open: (id) => ipcRenderer.send('open', id),
  menu: () => ipcRenderer.send('menu'),
})

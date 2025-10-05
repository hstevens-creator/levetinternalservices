const SCREEN_ID = localStorage.getItem('screenId') || prompt('Enter Screen ID:');
const PLAYER_KEY = localStorage.getItem('playerKey') || prompt('Enter Player Key:');
const SERVER_URL = localStorage.getItem('serverUrl') || 'http://localhost:3000';

localStorage.setItem('screenId', SCREEN_ID);
localStorage.setItem('playerKey', PLAYER_KEY);
localStorage.setItem('serverUrl', SERVER_URL);

const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity
});

let playlist = [];
let currentSlot = 0;
let isOnline = false;
let offlineMode = false;
let debugMode = false;
let errorCount = 0;
const MAX_ERRORS = 3;
const SLOT_DURATION = 10000;
const CACHE_SIZE_LIMIT = 500 * 1024 * 1024;

const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const contentDiv = document.getElementById('content');
const diagnostics = document.getElementById('diagnostics');

let db = null;

async function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LevetPlayerCache', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('content')) {
        const store = db.createObjectStore('content', { keyPath: 'url' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
        store.createIndex('size', 'size', { unique: false });
      }
    };
  });
}

async function cacheContent(url, blob, contentType) {
  try {
    const tx = db.transaction(['content'], 'readwrite');
    const store = tx.objectStore('content');
    
    await store.put({
      url,
      data: blob,
      contentType,
      size: blob.size,
      cachedAt: Date.now()
    });
    
    await manageCacheSize();
    console.log(`Cached: ${url}`);
  } catch (err) {
    console.error('Error caching content:', err);
  }
}

async function getCachedContent(url) {
  try {
    const tx = db.transaction(['content'], 'readonly');
    const store = tx.objectStore('content');
    return new Promise((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error getting cached content:', err);
    return null;
  }
}

async function manageCacheSize() {
  try {
    const tx = db.transaction(['content'], 'readwrite');
    const store = tx.objectStore('content');
    const index = store.index('cachedAt');
    
    let totalSize = 0;
    const items = [];
    
    return new Promise((resolve) => {
      const request = index.openCursor();
      request.onsuccess = async (event) => {
        const cursor = event.target.result;
        if (cursor) {
          items.push({ url: cursor.value.url, size: cursor.value.size, cachedAt: cursor.value.cachedAt });
          totalSize += cursor.value.size;
          cursor.continue();
        } else {
          if (totalSize > CACHE_SIZE_LIMIT) {
            items.sort((a, b) => a.cachedAt - b.cachedAt);
            
            for (const item of items) {
              if (totalSize <= CACHE_SIZE_LIMIT * 0.8) break;
              await store.delete(item.url);
              totalSize -= item.size;
              console.log(`Evicted from cache: ${item.url}`);
            }
          }
          resolve();
        }
      };
    });
  } catch (err) {
    console.error('Error managing cache size:', err);
  }
}

async function downloadAndCache(url) {
  try {
    const cached = await getCachedContent(url);
    if (cached) {
      return URL.createObjectURL(cached.data);
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    await cacheContent(url, blob, response.headers.get('content-type'));
    
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error(`Error downloading ${url}:`, err);
    
    const cached = await getCachedContent(url);
    if (cached) {
      return URL.createObjectURL(cached.data);
    }
    
    throw err;
  }
}

function updateStatus(online, text) {
  isOnline = online;
  statusIndicator.className = online ? 'status-online' : 'status-offline';
  statusText.textContent = text;
  
  if (debugMode) {
    document.getElementById('diag-online').textContent = online ? 'Yes' : 'No';
  }
}

function reportError(errorType, errorMessage) {
  errorCount++;
  console.error(`Error ${errorCount}/${MAX_ERRORS}:`, errorType, errorMessage);
  
  socket.emit('screen:error', {
    screenId: SCREEN_ID,
    errorType,
    errorMessage,
    timestamp: new Date().toISOString(),
    errorCount
  });
  
  if (errorCount >= MAX_ERRORS && isOnline) {
    sendEmailAlert(errorType, errorMessage);
  }
}

function sendEmailAlert(errorType, errorMessage) {
  fetch(`${SERVER_URL}/api/screens/${SCREEN_ID}/error-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_key: PLAYER_KEY,
      errorType,
      errorMessage,
      errorCount,
      timestamp: new Date().toISOString()
    })
  }).catch(err => console.error('Failed to send error alert:', err));
}

socket.on('connect', async () => {
  console.log('Connected to server');
  updateStatus(true, 'Connected');
  offlineMode = false;
  errorCount = 0;
  
  socket.emit('screen:register', {
    screenId: SCREEN_ID,
    playerKey: PLAYER_KEY
  });
  
  startHeartbeat();
  await fetchPlaylist();
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  updateStatus(false, 'Offline - Using Cache');
  offlineMode = true;
  
  if (playlist.length === 0) {
    reportError('DISCONNECTED', 'No cached content available');
  }
});

socket.on('screen:registered', (data) => {
  if (data.success) {
    console.log('Screen registered successfully');
    updateStatus(true, 'Online');
  } else {
    console.error('Failed to register screen:', data.error);
    updateStatus(false, 'Registration failed');
    reportError('AUTH_FAILED', data.error);
  }
});

socket.on('playlist:update', async (newPlaylist) => {
  console.log('Playlist updated:', newPlaylist);
  playlist = newPlaylist;
  
  for (const item of playlist) {
    try {
      await downloadAndCache(item.contentUrl);
    } catch (err) {
      console.error(`Failed to cache ${item.contentUrl}:`, err);
    }
  }
  
  if (debugMode) {
    document.getElementById('diag-content-count').textContent = playlist.length;
  }
  
  playSlot(0);
});

socket.on('screen:restart', () => {
  console.log('Restart command received');
  location.reload();
});

socket.on('screen:clear-cache', async () => {
  console.log('Clear cache command received');
  if (db) {
    const tx = db.transaction(['content'], 'readwrite');
    await tx.objectStore('content').clear();
    console.log('Cache cleared');
  }
});

socket.on('screen:debug-mode', (data) => {
  debugMode = data.enabled;
  diagnostics.style.display = debugMode ? 'block' : 'none';
});

async function fetchPlaylist() {
  try {
    const response = await fetch(`${SERVER_URL}/api/playlist/screen/${SCREEN_ID}?player_key=${PLAYER_KEY}`);
    if (response.ok) {
      const data = await response.json();
      playlist = data;
      
      for (const item of playlist) {
        try {
          await downloadAndCache(item.contentUrl);
        } catch (err) {
          console.error(`Failed to cache ${item.contentUrl}:`, err);
        }
      }
      
      if (debugMode) {
        document.getElementById('diag-content-count').textContent = playlist.length;
      }
      
      playSlot(0);
    } else {
      reportError('FETCH_FAILED', `HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Error fetching playlist:', err);
    reportError('FETCH_ERROR', err.message);
    
    if (playlist.length > 0) {
      playSlot(0);
    } else {
      contentDiv.innerHTML = '<h1 style="color: white; text-align: center;">No content available</h1>';
    }
  }
}

async function playSlot(slotIndex) {
  if (playlist.length === 0) {
    contentDiv.innerHTML = '<h1 style="color: white; text-align: center;">No content available</h1>';
    return;
  }
  
  currentSlot = slotIndex % playlist.length;
  const item = playlist[currentSlot];
  
  if (debugMode) {
    document.getElementById('diag-current-slot').textContent = `${currentSlot + 1}/${playlist.length}`;
  }
  
  try {
    const contentUrl = await downloadAndCache(item.contentUrl);
    
    if (item.type === 'image' || !item.type) {
      contentDiv.innerHTML = `<img src="${contentUrl}" alt="Advertisement" style="width: 100%; height: 100%; object-fit: contain;" />`;
    } else if (item.type === 'video') {
      contentDiv.innerHTML = `<video src="${contentUrl}" autoplay muted style="width: 100%; height: 100%; object-fit: contain;"></video>`;
      const video = contentDiv.querySelector('video');
      video.onended = () => playSlot(currentSlot + 1);
      return;
    }
    
    setTimeout(() => playSlot(currentSlot + 1), SLOT_DURATION);
  } catch (err) {
    console.error('Error playing content:', err);
    reportError('PLAYBACK_ERROR', err.message);
    
    setTimeout(() => playSlot(currentSlot + 1), SLOT_DURATION);
  }
}

function startHeartbeat() {
  setInterval(() => {
    if (isOnline) {
      socket.emit('screen:heartbeat', {
        screenId: SCREEN_ID,
        timestamp: new Date().toISOString(),
        playlistSize: playlist.length,
        currentSlot: currentSlot + 1,
        errorCount
      });
      
      if (debugMode) {
        document.getElementById('diag-heartbeat').textContent = new Date().toLocaleTimeString();
      }
    }
  }, 30000);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'd' && e.ctrlKey) {
    e.preventDefault();
    debugMode = !debugMode;
    diagnostics.style.display = debugMode ? 'block' : 'none';
    
    if (debugMode) {
      document.getElementById('diag-screen-id').textContent = SCREEN_ID;
      document.getElementById('diag-content-count').textContent = playlist.length;
      document.getElementById('diag-current-slot').textContent = `${currentSlot + 1}/${playlist.length}`;
      document.getElementById('diag-online').textContent = isOnline ? 'Yes' : 'No';
    }
  }
});

async function init() {
  try {
    db = await initIndexedDB();
    console.log('IndexedDB initialized');
    updateStatus(false, 'Connecting...');
  } catch (err) {
    console.error('Failed to initialize IndexedDB:', err);
    reportError('INIT_ERROR', 'Failed to initialize cache');
  }
}

init();

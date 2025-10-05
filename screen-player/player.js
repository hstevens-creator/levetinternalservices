const SCREEN_ID = localStorage.getItem('screenId') || prompt('Enter Screen ID:');
const PLAYER_KEY = localStorage.getItem('playerKey') || prompt('Enter Player Key:');
const SERVER_URL = localStorage.getItem('serverUrl') || 'http://localhost:3000';

localStorage.setItem('screenId', SCREEN_ID);
localStorage.setItem('playerKey', PLAYER_KEY);
localStorage.setItem('serverUrl', SERVER_URL);

const socket = io(SERVER_URL);
let currentPlaylist = [];
let currentIndex = 0;
let isPlaying = false;

const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const contentDiv = document.getElementById('content');
const diagnostics = document.getElementById('diagnostics');

function updateStatus(online, text) {
  statusIndicator.className = online ? 'status-online' : 'status-offline';
  statusText.textContent = text;
}

function showDiagnostics() {
  diagnostics.style.display = 'block';
  document.getElementById('diag-screen-id').textContent = SCREEN_ID;
}

socket.on('connect', () => {
  console.log('Connected to server');
  updateStatus(true, 'Connected');
  
  socket.emit('screen:register', {
    screenId: SCREEN_ID,
    playerKey: PLAYER_KEY
  });
  
  startHeartbeat();
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  updateStatus(false, 'Disconnected');
});

socket.on('screen:registered', (data) => {
  if (data.success) {
    console.log('Screen registered successfully');
    updateStatus(true, 'Online');
  } else {
    console.error('Failed to register screen:', data.error);
    updateStatus(false, 'Registration failed');
    alert('Failed to register: ' + data.error);
  }
});

socket.on('content:update', (content) => {
  console.log('Received content update:', content);
  if (Array.isArray(content)) {
    currentPlaylist = content;
  } else {
    currentPlaylist = [content];
  }
  document.getElementById('diag-content-count').textContent = currentPlaylist.length;
  playNextContent();
});

function playNextContent() {
  if (currentPlaylist.length === 0) {
    contentDiv.innerHTML = '<h1 style="color: white; text-align: center;">No content available</h1>';
    return;
  }
  
  const content = currentPlaylist[currentIndex];
  
  if (content.type === 'image') {
    contentDiv.innerHTML = `<img id="content" src="${content.url}" alt="Advertisement" />`;
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % currentPlaylist.length;
      playNextContent();
    }, (content.duration || 10) * 1000);
  } else if (content.type === 'video') {
    contentDiv.innerHTML = `<video id="content" src="${content.url}" autoplay muted></video>`;
    const video = document.getElementById('content');
    video.onended = () => {
      currentIndex = (currentIndex + 1) % currentPlaylist.length;
      playNextContent();
    };
  } else {
    contentDiv.innerHTML = `<div style="color: white; text-align: center;">
      <h1>${content.title || 'Advertisement'}</h1>
      <p>${content.description || ''}</p>
    </div>`;
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % currentPlaylist.length;
      playNextContent();
    }, (content.duration || 10) * 1000);
  }
}

function startHeartbeat() {
  setInterval(() => {
    socket.emit('screen:heartbeat', {
      screenId: SCREEN_ID,
      timestamp: new Date().toISOString()
    });
    document.getElementById('diag-heartbeat').textContent = new Date().toLocaleTimeString();
  }, 30000);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'd' && e.ctrlKey) {
    e.preventDefault();
    diagnostics.style.display = diagnostics.style.display === 'none' ? 'block' : 'none';
  }
});

updateStatus(false, 'Connecting...');

# Levet DigiBoard Player

A lightweight digital signage player for Raspberry Pi and Linux devices.

## Features

- Real-time content updates via WebSocket
- Supports images and videos
- Automatic playlist rotation
- Heartbeat monitoring
- Auto-start on boot capability
- Simple diagnostics display (Ctrl+D)

## Setup

### On Raspberry Pi / Linux

1. Install a modern web browser (Chromium recommended)
2. Open `index.html` in the browser
3. Enter your Screen ID and Player Key when prompted
4. The player will connect to the server and start displaying content

### Auto-start on Boot

For Raspberry Pi, you can set up auto-start using the following methods:

#### Method 1: Chromium Kiosk Mode

Create a file at `~/.config/autostart/levet-player.desktop`:

```
[Desktop Entry]
Type=Application
Name=Levet Player
Exec=chromium-browser --kiosk --app=file:///path/to/screen-player/index.html
```

#### Method 2: Using Systemd

Create a systemd service file at `/etc/systemd/system/levet-player.service`:

```
[Unit]
Description=Levet DigiBoard Player
After=network.target

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
ExecStart=/usr/bin/chromium-browser --kiosk --app=file:///home/pi/screen-player/index.html
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable levet-player
sudo systemctl start levet-player
```

## Configuration

The player stores configuration in localStorage:
- Screen ID
- Player Key
- Server URL (default: http://localhost:3000)

To reconfigure, clear your browser's localStorage or use the diagnostics menu.

## Diagnostics

Press `Ctrl+D` to toggle the diagnostics display, which shows:
- Screen ID
- Last heartbeat timestamp
- Number of content items in playlist

## Troubleshooting

- If the player shows "Registration failed", verify your Screen ID and Player Key
- If the player shows "Disconnected", check your network connection and server URL
- For video playback issues, ensure your browser supports the video codec

# Levet DigiBoard Player

Raspberry Pi-based digital screen player for Levet Media advertising operations.

## Features

- **6-Slot Playlist**: Displays ads in a weighted rotation across 6 slots with 10-second intervals
- **Offline Mode**: Caches content locally using IndexedDB (500MB limit) for uninterrupted playback
- **Custom Boot**: Levet-branded splash screen on startup
- **Error Detection**: Automatic error reporting with email alerts after 3 failures
- **Remote Control**: Restart, clear cache, and toggle debug mode from CMS dashboard
- **Debug Mode**: Press Ctrl+D to show diagnostics overlay
- **Heartbeat**: Reports status every 30 seconds to backend

## Raspberry Pi Setup

### 1. Install Raspberry Pi OS Lite

```bash
sudo apt update
sudo apt install -y --no-install-recommends xserver-xorg x11-xserver-utils xinit openbox chromium-browser unclutter
```

### 2. Configure Auto-Boot to Browser

```bash
mkdir -p ~/.config/openbox
cat > ~/.config/openbox/autostart << 'EOF'
xset s off
xset s noblank
xset -dpms

unclutter -idle 0.5 -root &

chromium-browser --noerrdialogs --disable-infobars --kiosk \
  --disable-session-crashed-bubble --disable-features=TranslateUI \
  file:///home/pi/levet-player/splash.html &
EOF

cat > ~/.xinitrc << 'EOF'
exec openbox-session
EOF

echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx' >> ~/.bash_profile
```

### 3. Install Player Files

```bash
mkdir -p ~/levet-player
cd ~/levet-player
```

### 4. Configure Player

On first boot, the player will prompt for:
- **Screen ID**: Unique identifier from CMS
- **Player Key**: Authentication key from CMS
- **Server URL**: Backend server address (e.g., https://cms.levet.com)

These values are saved in localStorage and persist across reboots.

### 5. Auto-Boot Configuration

```bash
sudo raspi-config
```

## Local Testing

For local testing without Raspberry Pi:

```bash
cd /path/to/levetinternalservices
docker-compose up -d

open screen-player/splash.html
```

## Debug Mode

Press **Ctrl+D** to toggle debug overlay showing:
- Screen ID
- Online/Offline status
- Playlist size
- Current slot position
- Last heartbeat timestamp

## Troubleshooting

### Player Won't Connect
- Check SERVER_URL is correct
- Verify Screen ID and Player Key are valid
- Check network connectivity
- Look for errors in browser console (F12)

### Content Not Displaying
- Verify playlist has content assigned in CMS
- Check browser console for download errors
- Ensure content URLs are accessible
- Try clearing cache (Ctrl+D, remote clear cache)

### Performance Issues
- Check cache size (limit is 500MB)
- Reduce image/video file sizes
- Ensure adequate storage space
- Monitor CPU/memory usage

## Remote Management

From CMS Dashboard:
- **Restart**: Reboot the player application
- **Clear Cache**: Remove all cached content
- **Debug Mode**: Enable/disable diagnostics remotely
- **View Status**: Monitor online/offline state and last seen time

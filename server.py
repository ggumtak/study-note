"""
Study Notes Server - System Tray Application
Right-click tray icon for options: Stop Server, Clear Cache
"""
import http.server
import socketserver
import threading
import webbrowser
import os
import sys

# Check for pystray
try:
    import pystray
    from PIL import Image
except ImportError:
    print("Installing required packages...")
    os.system("pip install pystray pillow")
    import pystray
    from PIL import Image

PORT = 8080
server = None
tray = None

def create_image():
    """Create a simple colored icon"""
    img = Image.new('RGB', (64, 64), color=(129, 201, 149))
    return img

def start_server():
    """Start HTTP server in background thread"""
    global server
    handler = http.server.SimpleHTTPRequestHandler
    server = socketserver.TCPServer(("0.0.0.0", PORT), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"Server started on port {PORT}")

def stop_server(icon=None, item=None):
    """Stop server and exit"""
    global server, tray
    if server:
        server.shutdown()
        print("Server stopped")
    if tray:
        tray.stop()
    sys.exit(0)

def open_browser(icon=None, item=None):
    """Open app in browser"""
    webbrowser.open(f"http://localhost:{PORT}")

def get_local_ip():
    """Get local IP for mobile access"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def main():
    global tray
    
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Start server
    start_server()
    
    # Open browser
    webbrowser.open(f"http://localhost:{PORT}")
    
    local_ip = get_local_ip()
    print(f"PC: http://localhost:{PORT}")
    print(f"Mobile: http://{local_ip}:{PORT}")
    
    # Create tray icon
    menu = pystray.Menu(
        pystray.MenuItem(f"📱 Mobile: {local_ip}:{PORT}", lambda: None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("🌐 Open Browser", open_browser),
        pystray.MenuItem("🛑 Stop Server", stop_server)
    )
    
    tray = pystray.Icon("study_notes", create_image(), "Study Notes Server", menu)
    tray.run()

if __name__ == "__main__":
    main()

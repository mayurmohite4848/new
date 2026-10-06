import os
import sys
import shutil
import subprocess
import time
import webbrowser

def kill_port_owners():
    """Kills any stale processes occupying ports 5000 or 5173 on Windows."""
    if sys.platform == "win32":
        try:
            # Find and terminate processes on 5000 and 5173
            cmd = "Get-NetTCPConnection -LocalPort 5000, 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
            subprocess.run(["powershell", "-Command", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass

def main():
    print("=" * 60)
    print("  NoteExtract AI — Unified Application Runner")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")
    backend_script = os.path.join(base_dir, "backend", "app.py")

    # Clean any stale port owners before starting
    kill_port_owners()

    # Detect python executable (virtualenv or active interpreter)
    if sys.platform == "win32":
        venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")
    else:
        venv_python = os.path.join(base_dir, "venv", "bin", "python3")

    python_cmd = venv_python if os.path.exists(venv_python) else sys.executable

    # Detect npm executable
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    if not shutil.which(npm_cmd) and sys.platform == "win32":
        os.environ["PATH"] = r"C:\Program Files\nodejs;" + os.environ.get("PATH", "")

    # 1. Start Python Flask Backend
    print(f"\n[1/2] Launching Flask Backend on http://127.0.0.1:5000 ...")
    backend_proc = subprocess.Popen(
        [python_cmd, backend_script],
        cwd=base_dir
    )

    # 2. Start React Vite Frontend with explicit host
    print(f"[2/2] Launching React Frontend on http://127.0.0.1:5173 ...")
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", "0.0.0.0"],
        cwd=frontend_dir,
        shell=(sys.platform == "win32")
    )

    time.sleep(2)
    print("\n" + "=" * 60)
    print("  Application is LIVE and ready:")
    print("  ➜ Frontend (React):   http://127.0.0.1:5173  (or http://localhost:5173)")
    print("  ➜ Backend API (Flask): http://127.0.0.1:5000/api/health")
    print("  Press Ctrl+C anytime to stop both servers.")
    print("=" * 60 + "\n")

    # Automatically open browser
    try:
        webbrowser.open("http://127.0.0.1:5173")
    except Exception:
        pass

    def cleanup():
        print("\nStopping NoteExtract AI servers...")
        try:
            if sys.platform == "win32":
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(backend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                backend_proc.terminate()
                frontend_proc.terminate()
        except Exception:
            pass
        kill_port_owners()
        print("Servers stopped cleanly. Goodbye!")

    try:
        # Keep running continuously while processes are alive
        while True:
            # Check if backend or frontend died unexpectedly
            b_poll = backend_proc.poll()
            f_poll = frontend_proc.poll()
            if b_poll is not None and f_poll is not None:
                break
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()
        sys.exit(0)

if __name__ == "__main__":
    main()

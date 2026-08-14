"""
Run Script for Flask Backend & React Frontend
Launches the Flask API server and Vite React frontend.
"""
import os
import sys
import subprocess
import time

def start_backend():
    """Starts the Flask backend."""
    python_exe = sys.executable
    venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), "venv", "Scripts", "python.exe")
    if os.path.exists(venv_python):
        python_exe = venv_python

    print("Starting Flask backend on http://127.0.0.1:5000...")
    backend_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "app.py")
    return subprocess.Popen([python_exe, backend_script])

def start_frontend():
    """Starts the Vite frontend dev server if npm is available."""
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    
    node_paths = [
        r"C:\Program Files\nodejs\npm.cmd",
        "npm.cmd",
        "npm"
    ]
    npm_cmd = None
    for p in node_paths:
        if os.path.exists(p) or shutil_which(p):
            npm_cmd = p
            break

    if not npm_cmd:
        print("[!] npm not found in standard paths. Start frontend manually with: cd frontend && npm run dev")
        return None

    env = os.environ.copy()
    if r"C:\Program Files\nodejs" not in env.get("PATH", ""):
        env["PATH"] = r"C:\Program Files\nodejs;" + env.get("PATH", "")

    print("Starting Vite React frontend on http://127.0.0.1:5173...")
    return subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir, env=env)

def shutil_which(cmd):
    import shutil
    return shutil.which(cmd)

def main():
    print("=" * 60)
    print("  NoteExtract AI - Flask + React + SQLite Project Runner")
    print("=" * 60)

    # Initialize backend DB
    venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), "venv", "Scripts", "python.exe")
    init_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "init_db.py")
    if os.path.exists(venv_python) and os.path.exists(init_script):
        subprocess.run([venv_python, init_script], check=False)

    backend_proc = start_backend()
    time.sleep(2)

    frontend_proc = start_frontend()
    time.sleep(2)

    print("\n[OK] Application is ready:")
    print("   -> Frontend (React):   http://127.0.0.1:5173")
    print("   -> Backend API (Flask): http://127.0.0.1:5000/api/health")
    print("\nPress Ctrl+C to stop all services.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        if frontend_proc:
            frontend_proc.terminate()
        if backend_proc:
            backend_proc.terminate()
        print("Done. Goodbye!")

if __name__ == "__main__":
    main()

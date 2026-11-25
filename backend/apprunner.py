"""Start all three backend services with one command.

    python apprunner.py                 # migrate + seed the DB, then start services
    python apprunner.py --skip-db-init  # start services only

Press Ctrl+C to stop everything.
"""
import subprocess
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
SERVICES = [
    ("user_app (5000)", BACKEND_DIR / "user_app" / "app.py"),
    ("grievance_app (5001)", BACKEND_DIR / "grievance_app" / "app.py"),
    ("admin_app (5002)", BACKEND_DIR / "admin_app" / "app.py"),
]


def stop_all(processes):
    for _, proc in processes:
        if proc.poll() is None:
            proc.terminate()
    for name, proc in processes:
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            print(f"Force-killing {name}")
            proc.kill()


def main():
    if "--skip-db-init" not in sys.argv:
        print("Preparing database...")
        result = subprocess.run([sys.executable, str(BACKEND_DIR / "manage.py"), "init-db"], cwd=BACKEND_DIR)
        if result.returncode != 0:
            sys.exit("Database initialisation failed; fix the error above (check DATABASE_URL in backend/.env).")

    processes = []
    for name, script in SERVICES:
        print(f"Starting {name}")
        processes.append((name, subprocess.Popen([sys.executable, str(script)], cwd=BACKEND_DIR)))

    print("All services started. Press Ctrl+C to stop.")
    exit_code = 0
    try:
        while True:
            for name, proc in processes:
                if proc.poll() is not None:
                    print(f"{name} exited with code {proc.returncode}; stopping the others.")
                    exit_code = proc.returncode or 1
                    raise KeyboardInterrupt
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
    finally:
        stop_all(processes)
    sys.exit(exit_code)


if __name__ == '__main__':
    main()

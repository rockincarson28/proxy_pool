#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Local startup script for ProxyPool
"""

import subprocess
import sys
import time
import threading
from multiprocessing import Process

def start_server():
    """Start the API server"""
    print("Starting ProxyPool API Server...")
    subprocess.run([sys.executable, "proxyPool.py", "server"])

def start_scheduler():
    """Start the scheduler"""
    print("Starting ProxyPool Scheduler...")
    time.sleep(5)  # Wait a bit for server to start
    subprocess.run([sys.executable, "proxyPool.py", "schedule"])

if __name__ == "__main__":
    print("Starting ProxyPool...")
    
    # Start server in a separate process
    server_process = Process(target=start_server)
    server_process.start()
    
    # Start scheduler in main process
    try:
        start_scheduler()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server_process.terminate()
        server_process.join()
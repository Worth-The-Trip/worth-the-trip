#!/bin/bash
# Clean up stale log/temp files in the wtt-data directory and guide image folders.
# Run this after deploys, or set up as a cron job on the server.

set -euo pipefail

RUNTIME_DIR="/home/customer/wtt-data"
GUIDE_IMG_DIR="/home/customer/wtt-data/public/Guide Images"

echo "=== WTT Stale File Cleanup ==="

# Clean wtt-data directory
if [ -d "$RUNTIME_DIR" ]; then
    echo "Scanning $RUNTIME_DIR..."
    # Remove old log files
    find "$RUNTIME_DIR" -maxdepth 1 -type f -name "*.log" -mtime +7 -delete 2>/dev/null
    # Remove old temp files
    find "$RUNTIME_DIR" -maxdepth 1 -type f -name "*.tmp" -mtime +7 -delete 2>/dev/null
    # Remove old backup files
    find "$RUNTIME_DIR" -maxdepth 1 -type f -name "*.bak" -mtime +7 -delete 2>/dev/null
    # Remove SQLite WAL and journal files (safe to delete during normal operation)
    find "$RUNTIME_DIR" -maxdepth 1 -type f -name "*.journal" -mtime +7 -delete 2>/dev/null
    find "$RUNTIME_DIR" -maxdepth 1 -type f -name "*.wal" -mtime +7 -delete 2>/dev/null
    echo "  Done scanning $RUNTIME_DIR"
fi

# Clean guide image directory
if [ -d "$GUIDE_IMG_DIR" ]; then
    echo "Scanning guide images folder..."
    # Remove old log files in guide images
    find "$GUIDE_IMG_DIR" -maxdepth 2 -type f -name "*.log" -mtime +7 -delete 2>/dev/null
    echo "  Done scanning guide images folder"
fi

# Report results
echo ""
echo "=== Quota Check ==="
echo "Used inodes: $(find "$RUNTIME_DIR" -type f 2>/dev/null | wc -l) files"
echo "Used disk: $(du -sh "$RUNTIME_DIR" 2>/dev/null || echo 'unknown')"
echo ""
echo "=== Cleanup complete ==="

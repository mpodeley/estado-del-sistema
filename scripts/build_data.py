#!/usr/bin/env python3
"""Orchestrator: fetch all data sources, parse, and generate JSONs for the dashboard."""

import os
import sys
import subprocess

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON = sys.executable


def run(script):
    print(f"\n{'='*60}")
    print(f"Running {script}...")
    print('='*60)
    result = subprocess.run(
        [PYTHON, os.path.join(SCRIPTS_DIR, script)],
        capture_output=False,
        cwd=os.path.join(SCRIPTS_DIR, '..'),
    )
    if result.returncode != 0:
        print(f"WARNING: {script} exited with code {result.returncode}")
    return result.returncode


def main():
    print("Estado del Sistema - Data Build Pipeline")
    print("="*60)

    errors = 0

    # Phase 1: Fetch new data
    errors += run('fetch_enargas.py')
    errors += run('fetch_weather.py')

    # Phase 2: Parse all sources
    errors += run('parse_base_excel.py')
    errors += run('parse_linepack.py')
    errors += run('parse_enargas.py')
    errors += run('parse_cammesa.py')

    print(f"\n{'='*60}")
    if errors:
        print(f"Pipeline finished with {errors} warnings/errors")
    else:
        print("Pipeline finished OK")
    print("JSONs in public/data/ are ready for the dashboard")

    # List output files
    data_dir = os.path.join(SCRIPTS_DIR, '..', 'public', 'data')
    if os.path.exists(data_dir):
        for f in sorted(os.listdir(data_dir)):
            size = os.path.getsize(os.path.join(data_dir, f))
            print(f"  {f}: {size:,} bytes")


if __name__ == '__main__':
    main()

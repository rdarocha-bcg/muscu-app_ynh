#!/bin/bash

# Common variables
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pkg_dir="$(cd "$script_dir/.." && pwd)"

# Copy app sources from package directory to install_dir, excluding packaging and dev artifacts.
ynh_copy_app_sources() {
    local dest="$1"

    rsync -a --delete \
        --exclude='.git/' \
        --exclude='.github/' \
        --exclude='scripts/' \
        --exclude='conf/' \
        --exclude='manifest.toml' \
        --exclude='tests.toml' \
        --exclude='CLAUDE.md' \
        --exclude='*.md' \
        --exclude='__pycache__/' \
        --exclude='*.pyc' \
        --exclude='*.pyo' \
        --exclude='backend/muscu.db' \
        --exclude='backend/venv/' \
        --exclude='backend/.env' \
        "$pkg_dir/" "$dest/"

    chown -R "$app:$app" "$dest"
}

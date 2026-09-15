#!/bin/sh
# Runs as root (the image's default at container start, despite the
# Dockerfile also creating appuser -- see its own comment for why), for
# exactly one reason: docker-compose.yml bind-mounts the host's ./data
# directory over /app/data at RUNTIME, and whatever's already in it
# (a DB file created by an earlier root-run container before this
# hardening pass, or a fresh directory Docker itself creates owned by
# root if nothing exists yet) arrives with whatever ownership it already
# has -- the image's own build-time `chown` (Dockerfile) only touched
# what existed at BUILD time, which the volume mount overlays and
# replaces entirely at container start. Without this, appuser can`t
# write to a root-owned predictions.db and every /predict call fails
# with "attempt to write a readonly database" (found live, not a
# theoretical concern -- see the hardening pass's own verification notes).
#
# Fixes ownership on every container start (idempotent, cheap even when
# already correct) then drops to appuser via gosu and execs the real
# command -- so the actual application process still runs as non-root,
# same security property the Dockerfile's USER/appuser setup was for;
# only this one-time startup fix needs root, not the long-running server.
set -e
# Skip the chown when ownership is already correct -- the first run after
# this hardening pass needs it (an old root-owned DB from before), but
# every restart after that doesn't, and re-chowning the whole directory
# (features.csv alone is 162MB+) on every single container start was
# real, measured startup overhead (see docker-compose.yml's healthcheck
# start_period comment) worth skipping once it's no longer necessary.
if [ "$(stat -c '%U' /app/data 2>/dev/null)" != "appuser" ]; then
    chown -R appuser:appuser /app/data
fi

# data/raw/*.csv are committed via Git LFS (see README's Dataset setup).
# If the machine that ran `git clone` doesn't have Git LFS installed,
# what actually lands in data/raw/ isn't the real CSV at all -- it's a
# small (~130-byte) text pointer file LFS uses as a stand-in
# ("version https://git-lfs.github.com/spec/v1\n..."), and every
# downstream step (pandas.read_csv, the feature builders) would either
# crash on a confusing parse error or silently misbehave. Checked here by
# file size (the real files are 90MB+; nothing legitimate at this path is
# ever under 1KB) so a missing Git LFS setup fails loudly with the actual
# fix, not a stack trace pointing at the wrong problem.
check_not_lfs_pointer() {
    path="$1"
    if [ -f "$path" ] && [ "$(wc -c < "$path")" -lt 1024 ]; then
        echo "[entrypoint] ERROR: $path is only $(wc -c < "$path") bytes -- this looks like a" >&2
        echo "[entrypoint] Git LFS pointer file, not the real dataset. Git LFS isn't installed" >&2
        echo "[entrypoint] (or wasn't installed) on the machine that cloned this repo." >&2
        echo "[entrypoint] Fix: install Git LFS (https://git-lfs.com), then from the repo root:" >&2
        echo "[entrypoint]   git lfs install && git lfs pull" >&2
        echo "[entrypoint] and restart this container." >&2
        exit 1
    fi
}
check_not_lfs_pointer /app/data/raw/creditcard.csv
check_not_lfs_pointer /app/data/raw/online_retail_ii.csv

# Auto-build derived feature files if missing. data/processed/ is
# deliberately never committed (fully regenerable, no reason to double
# the repo's Git LFS footprint for derived data) -- this is what turns
# "the raw datasets exist in data/raw/" (now true on a fresh clone, see
# README's Dataset setup) into "the API can actually start", with zero
# manual steps beyond `docker compose up --build`. Both are idempotent
# no-ops once the processed file already exists, and each guards on its
# own raw input existing too -- the fraud model's features build even if
# the Tier 2 return-risk dataset was never fetched, and vice versa.
if [ -f /app/data/raw/creditcard.csv ] && [ ! -f /app/data/processed/features.csv ]; then
    echo "[entrypoint] Building fraud-model features from data/raw/creditcard.csv (one-time, ~10s)..."
    gosu appuser python src/features/build_features.py
fi
if [ -f /app/data/raw/online_retail_ii.csv ] && [ ! -f /app/data/processed/return_features.csv ]; then
    echo "[entrypoint] Building return-risk features from data/raw/online_retail_ii.csv (one-time)..."
    gosu appuser python src/features/build_return_features.py
fi

exec gosu appuser "$@"

"""
Shared fixtures and utilities for Alfred visual + accessibility tests.

Usage:
  Run all checks:        ./tests/run_checks.sh
  Update baselines:      UPDATE_BASELINES=1 python3 -m pytest tests/visual/ -v
  Accessibility only:    python3 -m pytest tests/a11y/ -v
"""

import os
import io
import json

import numpy as np
import pytest
from PIL import Image, ImageChops, ImageFilter
from playwright.sync_api import sync_playwright

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT         = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_DIR = os.path.join(ROOT, "tests", "baselines")
DIFF_DIR     = os.path.join(ROOT, "tests", "diffs")
BASE_URL     = "http://localhost:3000"
UPDATE       = os.environ.get("UPDATE_BASELINES") == "1"

os.makedirs(BASELINE_DIR, exist_ok=True)
os.makedirs(DIFF_DIR,     exist_ok=True)

# ── Browser fixture (one per test session) ───────────────────────────────────
@pytest.fixture(scope="session")
def _browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        yield browser
        browser.close()


# ── Page fixture (one per test — fresh context each time) ────────────────────
@pytest.fixture
def page(_browser):
    ctx = _browser.new_context(viewport={"width": 1280, "height": 800})
    pg  = ctx.new_page()
    pg.goto(BASE_URL, wait_until="networkidle")
    pg.wait_for_selector("#screen-home.active", timeout=10_000)
    pg.wait_for_timeout(400)   # let entry animation settle
    yield pg
    ctx.close()


# ── Navigation helpers ────────────────────────────────────────────────────────
def nav_home(page):
    page.evaluate("goHome()")
    page.wait_for_selector("#screen-home.active", timeout=5_000)
    page.wait_for_timeout(400)


def nav_workspace(page, ws_id):
    """Navigate to a workspace by ID (mc | lam | lifeos | wealth)."""
    page.evaluate(f"enterWorkspace('{ws_id}')")
    page.wait_for_selector(f"#screen-{ws_id}.active", timeout=5_000)
    page.wait_for_timeout(500)  # sweep animations


def open_overlay(page, overlay_id):
    """Open a named overlay (memory | approvals)."""
    page.evaluate(f"openOverlay('{overlay_id}')")
    page.wait_for_selector(f"#overlay-{overlay_id}.open", timeout=5_000)
    page.wait_for_timeout(300)


def open_modal(page, modal_id):
    """Open a named modal."""
    page.evaluate(f"openModal('{modal_id}')")
    page.wait_for_selector(f"#{modal_id}.open", timeout=5_000)
    page.wait_for_timeout(300)


def close_modal(page, modal_id):
    page.evaluate(f"closeModal(null, '{modal_id}')")
    page.wait_for_timeout(200)


# ── Visual regression helper ─────────────────────────────────────────────────
# Threshold: mean per-channel difference, 0–255.
# 4.0 ≈ 1.6% — catches real layout drift; allows sub-pixel font rendering variance.
VISUAL_THRESHOLD = 4.0


def assert_visual(page, name: str, threshold: float = VISUAL_THRESHOLD):
    """
    Screenshot current page state and compare against stored baseline.

    First run (or UPDATE_BASELINES=1): saves the baseline and passes.
    Subsequent runs: fails if mean pixel difference exceeds threshold.
    Saves a visual diff to tests/diffs/<name>_diff.png on failure.
    """
    raw = page.screenshot(full_page=False)
    current = Image.open(io.BytesIO(raw)).convert("RGB")
    baseline_path = os.path.join(BASELINE_DIR, f"{name}.png")

    if UPDATE or not os.path.exists(baseline_path):
        current.save(baseline_path)
        return  # baseline created — pass

    baseline = Image.open(baseline_path).convert("RGB")

    # Resize current to baseline dimensions in case of viewport drift
    if current.size != baseline.size:
        current = current.resize(baseline.size, Image.LANCZOS)

    diff_img  = ImageChops.difference(current, baseline)
    diff_arr  = np.asarray(diff_img, dtype=np.float32)
    mean_diff = float(diff_arr.mean())

    if mean_diff > threshold:
        # Save colour-amplified diff for easy inspection
        amplified = Image.fromarray(np.clip(diff_arr * 8, 0, 255).astype(np.uint8))
        diff_path = os.path.join(DIFF_DIR, f"{name}_diff.png")
        amplified.save(diff_path)
        pytest.fail(
            f"Visual regression '{name}': mean diff {mean_diff:.2f}/255 "
            f"(threshold {threshold:.1f}). Diff → tests/diffs/{name}_diff.png"
        )

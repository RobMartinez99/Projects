"""
Visual regression tests for Alfred CEO OS — JARVIS HUD redesign.

Protects: home radar, 4 workspace screens, memory overlay, log-close modal.

Run:
  python3 -m pytest tests/visual/ -v
  UPDATE_BASELINES=1 python3 -m pytest tests/visual/ -v   # refresh baselines
"""

import pytest
from tests.conftest import (
    assert_visual,
    nav_home, nav_workspace,
    open_overlay, open_modal, close_modal,
)


# ── Home screen ───────────────────────────────────────────────────────────────

class TestHomeScreen:
    def test_home_radar(self, page):
        """Home command-center radar with 4 workspace nodes and alert bar."""
        nav_home(page)
        assert_visual(page, "home_radar")


# ── Workspace screens ─────────────────────────────────────────────────────────

class TestMartinezCapital:
    def test_mc_workspace(self, page):
        """MC: agent registry, pipeline, status panel, sync health."""
        nav_workspace(page, "mc")
        assert_visual(page, "workspace_mc")

    def test_mc_pipeline_visible(self, page):
        """MC pipeline section contains expected lead rows."""
        nav_workspace(page, "mc")
        rows = page.locator(".hud-list-item").count()
        assert rows >= 1, "Pipeline should show at least one lead"

    def test_mc_status_panel_values(self, page):
        """Revenue MTD and pipeline stats are rendered (not blank)."""
        nav_workspace(page, "mc")
        revenue = page.locator("#mcRevenueMTD").inner_text()
        assert revenue.strip() != "", "Revenue MTD must not be blank"


class TestLivingAlphaMale:
    def test_lam_workspace(self, page):
        """LAM: agent registry, revenue-by-product table, stats panel."""
        nav_workspace(page, "lam")
        assert_visual(page, "workspace_lam")

    def test_lam_product_table_rendered(self, page):
        """Revenue-by-product list has rows."""
        nav_workspace(page, "lam")
        rows = page.locator("#lamProductList .lam-product-row, #lamProductList .stat-row").count()
        assert rows >= 1, "Product list should render rows"


class TestLifeOS:
    def test_lifeos_workspace(self, page):
        """Life OS: non-negotiables, countdown, weight log, key dates."""
        nav_workspace(page, "lifeos")
        assert_visual(page, "workspace_lifeos")

    def test_lifeos_countdown_visible(self, page):
        """Target countdown numbers are visible."""
        nav_workspace(page, "lifeos")
        days = page.locator("#daysToQuit").inner_text()
        assert days.strip() not in ("", "—"), "Countdown days must render a real number"


class TestWealth:
    def test_wealth_workspace(self, page):
        """Wealth: urgent deadlines, debt snowball, credit scores, revenue."""
        nav_workspace(page, "wealth")
        assert_visual(page, "workspace_wealth")

    def test_wealth_debt_total_rendered(self, page):
        """Total debt figure is rendered."""
        nav_workspace(page, "wealth")
        total = page.locator("#wealthTotalDebt").inner_text()
        assert total.strip() not in ("", "—"), "Total debt must render a value"


# ── Overlay / modal states ────────────────────────────────────────────────────

class TestOverlays:
    def test_memory_overlay(self, page):
        """Memory overlay: facts panel, activity log, tabs."""
        nav_home(page)
        open_overlay(page, "memory")
        assert_visual(page, "overlay_memory")

    def test_log_close_modal(self, page):
        """Log-close modal: form fields, gold confirm button."""
        nav_workspace(page, "mc")
        open_modal(page, "modal-log-close")
        assert_visual(page, "modal_log_close")
        close_modal(page, "modal-log-close")

    def test_log_payment_modal(self, page):
        """Log-payment modal: account select, amount input."""
        nav_workspace(page, "wealth")
        open_modal(page, "modal-log-payment")
        assert_visual(page, "modal_log_payment")
        close_modal(page, "modal-log-payment")


# ── Chrome / layout integrity ─────────────────────────────────────────────────

class TestLayoutIntegrity:
    def test_no_horizontal_scroll(self, page):
        """Page must not overflow horizontally at 1280px."""
        for ws in ("mc", "lam", "lifeos", "wealth"):
            nav_workspace(page, ws)
            overflow = page.evaluate(
                "document.documentElement.scrollWidth > document.documentElement.clientWidth"
            )
            assert not overflow, f"Horizontal overflow detected in {ws} workspace"

    def test_hud_panels_not_clipped(self, page):
        """Visible (non-hidden) hud-panels in the active workspace must have non-zero height.
        Panels with display:none are intentionally collapsed when empty — excluded from check."""
        nav_workspace(page, "mc")
        result = page.evaluate("""
            Array.from(document.querySelectorAll('#screen-mc .hud-panel'))
                 .filter(el => getComputedStyle(el).display !== 'none')
                 .map(el => ({ h: el.getBoundingClientRect().height,
                               label: (el.querySelector('.panel-header')?.textContent || '').trim() }))
        """)
        zero = [r for r in result if r["h"] == 0]
        assert zero == [], f"Visible panels with zero height (may be overflow:hidden clipping): {zero}"

    def test_decorative_layers_no_pointer_events(self, page):
        """HUD atmosphere, scanlines, panel-chrome must never block clicks."""
        nav_workspace(page, "mc")
        blocking = page.evaluate("""
            ['.hud-atmosphere', '.hud-scanlines', '.panel-chrome', '.panel-sweep', '.ws-status-ring']
                .flatMap(sel => Array.from(document.querySelectorAll(sel)))
                .filter(el => getComputedStyle(el).pointerEvents !== 'none')
                .map(el => el.className)
        """)
        assert blocking == [], f"Decorative elements blocking pointer events: {blocking}"

    def test_scanlines_below_modals(self, page):
        """Scanlines z-index must be below modal-backdrop (900)."""
        nav_home(page)
        z = page.evaluate(
            "parseInt(getComputedStyle(document.querySelector('.hud-scanlines')).zIndex) || 0"
        )
        assert z < 900, f"hud-scanlines z-index {z} is >= modal z-index 900"

    def test_select_svg_arrow_intact(self, page):
        """select.hud-input elements must retain their SVG chevron background."""
        nav_workspace(page, "mc")
        open_modal(page, "modal-add-call")
        has_arrow = page.evaluate("""
            (() => {
              const sel = document.querySelector('#callGhlStage');
              if (!sel) return null;
              return getComputedStyle(sel).backgroundImage.includes('svg');
            })()
        """)
        assert has_arrow is True, "select.hud-input lost its SVG chevron arrow"
        close_modal(page, "modal-add-call")

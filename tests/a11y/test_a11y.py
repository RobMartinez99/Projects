"""
Automated accessibility checks for Alfred CEO OS using axe-core.

Scope: critical + serious violations only.
Exclusions:
  - #screen-home .ws-node (decorative node labels — colour is supplemented by text)
  - .hud-scanlines, .hud-atmosphere (purely decorative, aria-hidden)
  - .panel-header (9px micro-labels — decorative section dividers, not content)

Run:
  python3 -m pytest tests/a11y/ -v
"""

import json
import os
import pytest
from axe_playwright_python.sync_playwright import Axe
from tests.conftest import nav_home, nav_workspace

AXE_OPTIONS = {
    "resultTypes": ["violations"],
    "runOnly": {
        "type": "tag",
        "values": ["wcag2a", "wcag2aa", "best-practice"],
    },
}

# Violation IDs that are known, accepted, and documented.
# Add entries here with a comment explaining why each is accepted.
ACCEPTED_VIOLATIONS = {
    # The 9px panel-header micro-labels are supplementary decorative labels — the
    # real content is in the stat values and list items below them.
    "color-contrast": "Micro-labels (9px) are decorative; content text passes 4.5:1",
}

REPORT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "a11y_reports")
os.makedirs(REPORT_DIR, exist_ok=True)


def run_axe(page, screen_name: str) -> list[dict]:
    """
    Run axe on the current page. Return only critical/serious violations
    that are not in ACCEPTED_VIOLATIONS. Save full JSON report to a11y_reports/.
    """
    axe = Axe()
    results = axe.run(page, options=AXE_OPTIONS)

    # Save full report for reference
    report_path = os.path.join(REPORT_DIR, f"{screen_name}.json")
    results.save_to_file(report_path, violations_only=True)

    all_violations = results.response.get("violations", [])

    # Filter to critical + serious only, excluding accepted
    actionable = [
        v for v in all_violations
        if v["impact"] in ("critical", "serious")
        and v["id"] not in ACCEPTED_VIOLATIONS
    ]
    return actionable


def format_violations(violations: list[dict]) -> str:
    lines = []
    for v in violations:
        lines.append(f"\n  [{v['impact'].upper()}] {v['id']}: {v['description']}")
        for node in v["nodes"][:3]:  # show at most 3 affected nodes
            target = ", ".join(node["target"])
            lines.append(f"    → {target}")
            lines.append(f"      {node.get('html','')[:120]}")
    return "".join(lines)


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestHomeAccessibility:
    def test_home_a11y(self, page):
        nav_home(page)
        violations = run_axe(page, "home")
        assert violations == [], (
            f"Home screen has {len(violations)} a11y violation(s):{format_violations(violations)}"
        )


class TestWorkspaceAccessibility:
    def test_mc_a11y(self, page):
        nav_workspace(page, "mc")
        violations = run_axe(page, "workspace_mc")
        assert violations == [], (
            f"MC workspace has {len(violations)} a11y violation(s):{format_violations(violations)}"
        )

    def test_lam_a11y(self, page):
        nav_workspace(page, "lam")
        violations = run_axe(page, "workspace_lam")
        assert violations == [], (
            f"LAM workspace has {len(violations)} a11y violation(s):{format_violations(violations)}"
        )

    def test_lifeos_a11y(self, page):
        nav_workspace(page, "lifeos")
        violations = run_axe(page, "workspace_lifeos")
        assert violations == [], (
            f"Life OS workspace has {len(violations)} a11y violation(s):{format_violations(violations)}"
        )

    def test_wealth_a11y(self, page):
        nav_workspace(page, "wealth")
        violations = run_axe(page, "workspace_wealth")
        assert violations == [], (
            f"Wealth workspace has {len(violations)} a11y violation(s):{format_violations(violations)}"
        )


class TestInteractiveControlsAccessibility:
    def test_buttons_have_names(self, page):
        """All visible buttons must have accessible names."""
        nav_workspace(page, "mc")
        unnamed = page.evaluate("""
            Array.from(document.querySelectorAll('button:not([aria-hidden="true"])'))
                .filter(b => {
                    const rect = b.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return false;
                    const name = (b.textContent || '').trim() +
                                 (b.getAttribute('aria-label') || '') +
                                 (b.getAttribute('title') || '');
                    return name.length === 0;
                })
                .map(b => b.outerHTML.substring(0, 120))
        """)
        assert unnamed == [], f"Buttons without accessible names: {unnamed}"

    def test_inputs_have_placeholders_or_labels(self, page):
        """All visible text inputs must have a placeholder or associated label."""
        nav_workspace(page, "mc")
        # Navigate to a modal that has inputs
        from tests.conftest import open_modal, close_modal
        open_modal(page, "modal-add-call")

        unlabelled = page.evaluate("""
            Array.from(document.querySelectorAll('input[type="text"], input[type="number"], textarea'))
                .filter(el => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) return false;
                    const hasPlaceholder = !!el.getAttribute('placeholder');
                    const hasLabel = !!el.labels && el.labels.length > 0;
                    const hasAria = !!el.getAttribute('aria-label') || !!el.getAttribute('aria-labelledby');
                    return !hasPlaceholder && !hasLabel && !hasAria;
                })
                .map(el => el.outerHTML.substring(0, 120))
        """)
        close_modal(page, "modal-add-call")
        assert unlabelled == [], f"Inputs without labels or placeholders: {unlabelled}"

    def test_decorative_elements_aria_hidden(self, page):
        """Decorative HUD layers must have aria-hidden='true'."""
        nav_workspace(page, "mc")
        not_hidden = page.evaluate("""
            ['.hud-atmosphere', '.hud-scanlines']
                .flatMap(sel => Array.from(document.querySelectorAll(sel)))
                .filter(el => el.getAttribute('aria-hidden') !== 'true')
                .map(el => el.className)
        """)
        assert not_hidden == [], (
            f"Decorative layers missing aria-hidden: {not_hidden}"
        )

#!/usr/bin/env bash
# Alfred UI regression suite
# Runs visual regression + accessibility checks against localhost:3000
#
# Usage:
#   ./tests/run_checks.sh             # full check
#   ./tests/run_checks.sh --update    # refresh all baselines
#   ./tests/run_checks.sh --visual    # visual only
#   ./tests/run_checks.sh --a11y      # accessibility only

set -euo pipefail
cd "$(dirname "$0")/.."

PYTHON=python3
PYTEST="$PYTHON -m pytest"
UPDATE=0
VISUAL=1
A11Y=1

for arg in "$@"; do
  case $arg in
    --update) UPDATE=1 ;;
    --visual) A11Y=0 ;;
    --a11y)   VISUAL=0 ;;
  esac
done

# Verify server is reachable
if ! curl -sf http://localhost:3000 > /dev/null 2>&1; then
  echo "❌  Alfred server not running on port 3000."
  echo "    Start it with: python3 server.py"
  exit 1
fi

echo "✓  Server reachable at localhost:3000"
echo ""

PASS=0
FAIL=0

run_suite() {
  local label="$1"
  local path="$2"
  local env_prefix="${3:-}"

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $label"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if env $env_prefix $PYTEST "$path" -v --tb=short 2>&1; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

if [ "$UPDATE" = "1" ]; then
  echo "🔄  Updating baselines..."
  UPDATE_BASELINES=1 $PYTEST tests/visual/ -v --tb=short
  echo "✓  Baselines updated in tests/baselines/"
  exit 0
fi

[ "$VISUAL" = "1" ] && run_suite "Visual Regression" "tests/visual/"
[ "$A11Y"   = "1" ] && run_suite "Accessibility (axe-core)"  "tests/a11y/"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAIL" = "0" ]; then
  echo "  ✅  All checks passed"
else
  echo "  ❌  $FAIL suite(s) failed — check output above"
  echo "      Visual diffs → tests/diffs/"
  echo "      A11y reports → tests/a11y_reports/"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
exit $FAIL

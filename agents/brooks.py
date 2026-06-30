"""Brooks — CFO sub-agent contract.

Role: financial analysis, debt snowball recommendations, revenue-vs-goal gap.
Scope: Wealth + MC/LAM revenue. Advisory by default; payment recommendations require approval.
"""

from .base import AgentContract, AgentInput, AgentResponse

BROOKS_SYSTEM = """You are Brooks, Chief Financial Officer for Rob Martinez.
You analyze debt, income, and revenue data and return structured financial recommendations.

YOUR ONLY JOB: analyze the data provided and return a structured response.
You never contact lenders, move money, or interact with any external system.

FIXED OBLIGATIONS — never recommend skipping these:
- IRS ConServe: $50/month minimum payment (tax debt rehab)
- Student loan rehab: $5/month minimum (9 payments total to exit default — track progress)

SNOWBALL ORDER (authoritative — from state):
Recommend changes to snowball order only when the analysis clearly supports it.
Never override the stored order without explicit instruction from Rob.

REVENUE CONTEXT:
- MC revenue goal: $10K/month by September 1, 2026
- Total income = MC MTD + LAM MTD + W2 biweekly
- Monthly surplus estimate = total income − fixed obligations − estimated living expenses

ANALYSIS RULES:
- Lead with the kill target — what gets paid off first and when
- Flag if any deadline is overdue
- Do not speculate about market conditions, investments, or anything outside the data given
- If recommending a payment action (not just analysis), set action_type = "payment_recommendation"

Return ONLY valid JSON. No explanation before or after. Exact shape:
{
  "summary": "2-3 sentence financial summary",
  "kill_target": "account name",
  "kill_target_balance": <number>,
  "days_to_kill_est": <integer or null>,
  "revenue_vs_goal": "string (e.g. '$1,200 / $10,000 — 12% of goal')",
  "monthly_surplus_est": <number or null>,
  "next_action": "specific actionable next step",
  "action_type": "analysis|payment_recommendation",
  "payment_recommendation": null,
  "compliance_flags": ["any fixed obligation notes or flags"]
}

If action_type is "payment_recommendation", populate payment_recommendation as:
{
  "account": "account name",
  "amount": <number>,
  "rationale": "why this payment now"
}"""


class BrooksContract(AgentContract):

    def invoke(self, inp: AgentInput) -> AgentResponse:
        ctx = inp.context

        ctx_lines = []

        # Debt overview
        if ctx.get("total_debt") is not None:
            ctx_lines.append(f"Total debt: ${ctx['total_debt']:,.2f}")
        if ctx.get("net_worth") is not None:
            ctx_lines.append(f"Net worth: ${ctx['net_worth']:,.2f}")

        # Snowball order
        if ctx.get("snowball_order"):
            order = ctx["snowball_order"]
            ctx_lines.append("Snowball order: " + " → ".join(
                f"{s['account']} (${s.get('balance',0):,.0f}, {s.get('status','')})"
                for s in order
            ))

        # Full debt list
        if ctx.get("debt"):
            debt_lines = [
                f"  {d['account']}: ${d.get('balance',0):,.0f}{' — ' + d['note'] if d.get('note') else ''}"
                for d in ctx["debt"]
            ]
            ctx_lines.append("All accounts:\n" + "\n".join(debt_lines))

        # Income
        income = ctx.get("income", {})
        w2 = income.get("w2Biweekly", 0)
        mc_rev = ctx.get("mc_revenue_mtd", 0)
        lam_rev = ctx.get("lam_revenue_mtd", 0)
        if w2 or mc_rev or lam_rev:
            ctx_lines.append(
                f"Income: W2 biweekly ${w2:,.0f} | MC MTD ${mc_rev:,.0f} | LAM MTD ${lam_rev:,.0f}"
            )

        # Open deadlines
        if ctx.get("urgent_deadlines"):
            open_dl = [d for d in ctx["urgent_deadlines"] if not d.get("resolvedStatus")]
            if open_dl:
                ctx_lines.append("Open deadlines: " + "; ".join(
                    d["label"] + (" — OVERDUE" if d.get("daysOut", 1) < 0 else "")
                    for d in open_dl
                ))

        if ctx.get("memory_facts"):
            relevant = [f for f in ctx["memory_facts"] if any(
                kw in f.lower() for kw in ["debt", "irs", "student", "loan", "credit", "payment", "wealth"]
            )]
            if relevant:
                ctx_lines.append("Relevant facts:\n" + "\n".join(f"  - {f}" for f in relevant[:4]))

        if inp.trigger:
            ctx_lines.append("Trigger: " + str(inp.trigger))

        context_block = "\n".join(ctx_lines) if ctx_lines else "(no financial context provided)"

        user_prompt = f"""CONTEXT:
{context_block}

INSTRUCTION:
{inp.prompt}"""

        raw = self._call_claude(BROOKS_SYSTEM, user_prompt)

        fallback = {
            "summary": "Could not parse financial analysis — review raw response.",
            "kill_target": ctx.get("snowball_order", [{}])[0].get("account", "unknown") if ctx.get("snowball_order") else "unknown",
            "kill_target_balance": None,
            "days_to_kill_est": None,
            "revenue_vs_goal": f"MC MTD ${ctx.get('mc_revenue_mtd', 0):,.0f}",
            "monthly_surplus_est": None,
            "next_action": "Review financial data manually",
            "action_type": "analysis",
            "payment_recommendation": None,
            "compliance_flags": ["parse_error — review raw output"],
        }
        parsed = self._parse_json(raw, fallback)

        action_type = parsed.get("action_type", "analysis")
        approval_required = action_type == "payment_recommendation"

        return AgentResponse(
            agent="brooks",
            action_type=action_type,
            approval_required=approval_required,
            payload=parsed,
            compliance_flags=parsed.get("compliance_flags", []),
            context_note=parsed.get("summary", ""),
        )

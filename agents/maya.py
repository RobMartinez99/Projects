"""Maya — COO sub-agent contract.

Role: draft outreach and post-close messages for Rob Martinez.
Scope: MC only. Returns drafts for approval. Never sends anything directly.
"""

import json
from .base import AgentContract, AgentInput, AgentResponse

MAYA_SYSTEM = """You are Maya, Chief Operating Officer for Martinez Capital.
You draft outreach, follow-up, and post-close messages for Rob Martinez (the owner).

YOUR ONLY JOB: produce a single compliant message draft based on the context and instruction given.

HARD RULES — violating any of these makes the draft invalid:
1. Body must be under 100 words. Count carefully.
2. CTA must be exactly "Book Your Consultation" — NEVER "Book Your Free Consultation"
3. Never promise a free product, gift, or discount
4. Never make a second referral ask in the same close cycle (check context for prior referral_ask)
5. Florida calling hours: 8AM–8PM only — note in compliance_flags if timing is relevant
6. Brand: Martinez Capital — never Rob Martinez's personal name in outreach

CHANNEL DEFAULTS:
- "email" → include subject line
- "text" or "dm" → no subject, body under 160 chars if text

Return ONLY valid JSON. No explanation before or after. Exact shape:
{
  "draft": {
    "to": "contact name or role",
    "channel": "email|text|dm",
    "subject": "string or null",
    "body": "the full draft text",
    "cta": "Book Your Consultation"
  },
  "word_count": <integer>,
  "compliance_flags": ["list any rules triggered or noted"],
  "context_note": "one sentence: why this draft was generated"
}"""


class MayaContract(AgentContract):

    def invoke(self, inp: AgentInput) -> AgentResponse:
        ctx = inp.context

        # Build context block for the prompt
        ctx_lines = []
        if ctx.get("closings"):
            recent = ctx["closings"][-3:]
            ctx_lines.append("Recent closes: " + "; ".join(
                f"{c['contact']} ${c.get('premium',0):.0f} on {c.get('date','?')}"
                for c in recent
            ))
        if ctx.get("call_list"):
            ctx_lines.append("Call list: " + ", ".join(
                f"{c['name']} [{c.get('stage') or c.get('status','?')}]"
                for c in ctx["call_list"][:5]
            ))
        if ctx.get("follow_up_queue"):
            ctx_lines.append("Follow-up queue: " + ", ".join(
                c["name"] for c in ctx["follow_up_queue"][:5]
            ))
        if ctx.get("revenue_mtd") is not None:
            ctx_lines.append(f"Revenue MTD: ${ctx['revenue_mtd']:,.0f} (goal: {ctx.get('revenue_goal','?')})")
        if ctx.get("memory_facts"):
            ctx_lines.append("Compliance facts:\n" + "\n".join(
                f"  - {f}" for f in ctx["memory_facts"][:5]
            ))
        if inp.trigger:
            ctx_lines.append("Trigger event: " + json.dumps(inp.trigger))

        context_block = "\n".join(ctx_lines) if ctx_lines else "(no additional context)"

        user_prompt = f"""CONTEXT:
{context_block}

INSTRUCTION:
{inp.prompt}"""

        raw = self._call_claude(MAYA_SYSTEM, user_prompt)

        fallback = {
            "draft": {
                "to": inp.trigger.get("contact", "unknown"),
                "channel": "email",
                "subject": None,
                "body": raw[:300],
                "cta": "Book Your Consultation",
            },
            "word_count": len(raw.split()),
            "compliance_flags": ["parse_error — review raw output"],
            "context_note": "Draft could not be parsed as JSON — raw response returned",
        }
        parsed = self._parse_json(raw, fallback)

        # Enforce CTA regardless of what Claude returned
        if isinstance(parsed.get("draft"), dict):
            parsed["draft"]["cta"] = "Book Your Consultation"
            body = parsed["draft"].get("body", "")
            if "Book Your Free Consultation" in body:
                parsed["draft"]["body"] = body.replace(
                    "Book Your Free Consultation", "Book Your Consultation"
                )
                parsed.setdefault("compliance_flags", []).append(
                    "CTA corrected: removed 'Free'"
                )

        return AgentResponse(
            agent="maya",
            action_type="draft_send",
            approval_required=True,
            payload=parsed,
            compliance_flags=parsed.get("compliance_flags", []),
            context_note=parsed.get("context_note", ""),
        )

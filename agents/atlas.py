"""Atlas — Sales Copilot sub-agent contract.

Role: live-call carrier routing and objection handling for Rob Martinez.
Scope: MC only. Advisory — returns recommendations only, never executes anything.
"""

from .base import AgentContract, AgentInput, AgentResponse

ATLAS_SYSTEM = """You are Atlas, Sales Copilot for Martinez Capital.
You support Rob Martinez during live final expense insurance calls.

YOUR ONLY JOB: return a structured recommendation — carrier, product, script line, and next step.
You never send anything, log anything, or take any action.

CARRIER STACK (strict priority order — exhaust earlier options before moving down):
1. Americo Eagle Premier (simplified issue, health Qs No + within build chart) — up to $35K
   Americo Eagle Guaranteed (GI, any Q Yes or outside build chart) — $5K–$15K, ages 50–80
2. Mutual of Omaha Living Promise — $2K–$50K, simplified issue
3. Corebridge SimpliNow Legacy — simplified issue
4. ETHOS TruStage:
   - Advantage WL: simplified issue
   - GAWL: TRUE GI — $2K–$20K, ages 45–80, 2yr graded (100% premiums + 10%), FL available
5. American-Amicable Golden Solution: SIMPLIFIED ISSUE ONLY — NOT GI
   - Immediate/Graded/ROP tiers, hard knockouts on Q1-Q3, max $50K Immediate ages 50–75

GI CEILING: $20,000. No carrier in the current stack offers GI above $20K.
If client needs GI above $20K: set gi_ceiling_flag=true and explain the gap to Rob.

ETHOS GAWL disclosure (mandatory when routing there):
"There is a 2-year graded period — if passing occurs in years 1–2, beneficiaries receive 100% of premiums plus 10% interest."

Am-Am is SIMPLIFIED ISSUE — never present as GI regardless of context.

OBJECTION HANDLING PRIORITY:
- Price concern → reframe as daily cost, compare to burial cost
- Health concerns → route down to appropriate GI product
- "I need to think about it" → confirm they're protecting family, not buying for themselves
- "My kids will handle it" → beneficiary protection framing

Return ONLY valid JSON. No explanation before or after. Exact shape:
{
  "carrier": "Americo|MoO|Corebridge|ETHOS|Am-Am|none",
  "product": "specific product name or null",
  "script_line": "exact words Rob can say on the call right now",
  "objection_response": "string or null (only if objection handling requested)",
  "next_step": "what Rob should do next on this call",
  "routing_reason": "one sentence: why this carrier was selected",
  "gi_ceiling_flag": false,
  "ethos_gawl_disclosure_required": false
}"""


class AtlasContract(AgentContract):

    def invoke(self, inp: AgentInput) -> AgentResponse:
        ctx = inp.context

        ctx_lines = []
        if ctx.get("call_list"):
            ctx_lines.append("Active leads: " + ", ".join(
                f"{c['name']} [{c.get('stage') or c.get('status','?')}]"
                for c in ctx["call_list"][:5]
            ))
        if inp.trigger:
            t = inp.trigger
            if t.get("lead_name"):
                ctx_lines.append(f"Current lead on call: {t['lead_name']}")
            if t.get("age"):
                ctx_lines.append(f"Client age: {t['age']}")
            if t.get("health_flags"):
                ctx_lines.append(f"Health flags: {', '.join(t['health_flags'])}")
            if t.get("coverage_need"):
                ctx_lines.append(f"Coverage need: ${t['coverage_need']:,}")
        if ctx.get("memory_facts"):
            # Only pass compliance-relevant facts to Atlas
            relevant = [f for f in ctx["memory_facts"] if any(
                kw in f.lower() for kw in ["carrier", "fl ", "florida", "americo", "ethos", "gi ", "guaranteed"]
            )]
            if relevant:
                ctx_lines.append("Relevant facts:\n" + "\n".join(f"  - {f}" for f in relevant[:4]))

        context_block = "\n".join(ctx_lines) if ctx_lines else "(no lead context provided)"

        user_prompt = f"""CONTEXT:
{context_block}

INSTRUCTION:
{inp.prompt}"""

        raw = self._call_claude(ATLAS_SYSTEM, user_prompt)

        fallback = {
            "carrier": "none",
            "product": None,
            "script_line": "Let me pull up the best option for you — one moment.",
            "objection_response": None,
            "next_step": "Review context and determine carrier manually",
            "routing_reason": "Could not parse recommendation — review raw response",
            "gi_ceiling_flag": False,
            "ethos_gawl_disclosure_required": False,
        }
        parsed = self._parse_json(raw, fallback)

        flags = []
        if parsed.get("gi_ceiling_flag"):
            flags.append("GI ceiling reached — no carrier in stack covers GI above $20K")
        if parsed.get("ethos_gawl_disclosure_required"):
            flags.append("ETHOS GAWL disclosure required — deliver graded benefit language")
        if parsed.get("carrier") == "Am-Am":
            flags.append("Am-Am is simplified issue only — confirm client passed health questions")

        return AgentResponse(
            agent="atlas",
            action_type="recommendation",
            approval_required=False,  # Atlas never requires approval — advisory only
            payload=parsed,
            compliance_flags=flags,
            context_note=parsed.get("routing_reason", ""),
        )

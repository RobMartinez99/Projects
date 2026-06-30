"""Alfred sub-agent contracts — base types and abstract interface."""

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class AgentInput:
    workspace: str          # "mc" | "wealth"
    agent_name: str         # "maya" | "atlas" | "brooks"
    context: dict           # server-constructed — only permitted fields for this agent
    prompt: str             # Rob's instruction or triggering event description
    trigger: dict = field(default_factory=dict)  # optional event metadata (e.g. close_id, lead_name)


@dataclass
class AgentResponse:
    agent: str
    action_type: str        # "draft_send" | "recommendation" | "analysis" | "payment_recommendation"
    approval_required: bool
    payload: dict           # agent-specific structured output
    compliance_flags: list = field(default_factory=list)
    context_note: str = ""  # why this response was generated

    def to_dict(self) -> dict:
        return {
            "agent": self.agent,
            "action_type": self.action_type,
            "approval_required": self.approval_required,
            "payload": self.payload,
            "compliance_flags": self.compliance_flags,
            "context_note": self.context_note,
        }


# Callable type for the Claude API wrapper injected into each agent.
# Signature: (system: str, prompt: str) -> str
CallClaude = Callable[[str, str], str]


class AgentContract(ABC):
    """
    Base class for all Alfred sub-agents.

    Agents receive a server-constructed AgentInput and return a structured
    AgentResponse. They never read files, hit external APIs, or write state
    directly. All writes go through the approval queue via the server.
    """

    def __init__(self, call_claude: CallClaude):
        self._call_claude = call_claude

    @abstractmethod
    def invoke(self, inp: AgentInput) -> AgentResponse:
        ...

    def _parse_json(self, text: str, fallback: dict) -> dict:
        """Parse JSON from Claude response, stripping markdown fences if present."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            cleaned = "\n".join(
                l for l in lines if not l.strip().startswith("```")
            ).strip()
        try:
            return json.loads(cleaned)
        except (json.JSONDecodeError, ValueError):
            return {**fallback, "_parse_error": True, "_raw": text[:500]}

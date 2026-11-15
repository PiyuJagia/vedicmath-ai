"""Typed Pydantic contracts for Coach messages and animation UI actions.

Action metadata lives outside conversational text so React can render buttons
or auto-open the stage without parsing LLM prose.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class CharacterId(str, Enum):
    BOY_COACH = "boy_coach"
    RABBIT = "rabbit"
    HUMMINGBIRD = "hummingbird"


class CharacterIdentity(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: CharacterId
    display_name: str

    @classmethod
    def from_id(cls, character_id: CharacterId | str) -> CharacterIdentity:
        cid = CharacterId(character_id)
        labels = {
            # Learner-facing name; internal id remains boy_coach for API compatibility.
            CharacterId.BOY_COACH: "Rishi",
            CharacterId.RABBIT: "Rabbit",
            CharacterId.HUMMINGBIRD: "Hummingbird",
        }
        return cls(id=cid, display_name=labels[cid])


class AnimationFormat(str, Enum):
    GROUPED = "grouped"
    FLAT = "flat"


class AnimationIntent(str, Enum):
    WATCH = "watch_animation"
    OPEN = "open_animation"


class VerifiedCalculationRef(BaseModel):
    """Backend-owned reference to a verified engine calculation."""

    model_config = ConfigDict(extra="forbid")

    calculation_id: str
    sutra_id: str
    difficulty: str
    numbers: list[int]
    result: int


class AgentMessage(BaseModel):
    """Conversational text only — never carries animation events."""

    model_config = ConfigDict(extra="forbid")

    text: str
    character: CharacterIdentity


class WatchAnimationAction(BaseModel):
    """Offer a Watch animation button after a successful calculation."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["watch_animation"] = "watch_animation"
    calculation_id: str
    animation_format: AnimationFormat
    auto_open: Literal[False] = False


class OpenAnimationAction(BaseModel):
    """Auto-open the stage when the learner explicitly requested animation."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["open_animation"] = "open_animation"
    calculation_id: str
    animation_format: AnimationFormat
    auto_open: Literal[True] = True


UiAction = Union[WatchAnimationAction, OpenAnimationAction]


class LessonAnimationPayload(BaseModel):
    """Engine-authored lesson fragment safe for the animation stage."""

    model_config = ConfigDict(extra="forbid")

    calculation_id: str
    sutra_id: str
    sutra: str
    numbers: list[int]
    difficulty: str
    result: int
    animation_format: AnimationFormat
    teaching_steps: list[Any]
    animation_steps: list[Any]


class CoachHandoffResponse(BaseModel):
    """Full handoff envelope: prose + verified ref + UI actions (+ optional lesson)."""

    model_config = ConfigDict(extra="forbid")

    ok: Literal[True] = True
    message: AgentMessage
    calculation: Optional[VerifiedCalculationRef] = None
    actions: list[UiAction] = Field(default_factory=list)
    lesson: Optional[LessonAnimationPayload] = None


class HandoffErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: Literal[False] = False
    code: str
    message: str


class CreateSessionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str


class CalculateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: str
    sutra: str
    difficulty: str = "beginner"
    a: Optional[int] = None
    b: Optional[int] = None
    number: Optional[int] = None
    # After a successful calc, offer a Watch button by default.
    offer_watch: bool = True
    character_id: CharacterId = CharacterId.BOY_COACH
    text: str = "Here is the verified result."


class CalculateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: Literal[True] = True
    calculation: VerifiedCalculationRef
    teaching_steps: list[Any]
    handoff: CoachHandoffResponse


class AnimationResolveRequest(BaseModel):
    """Structured animation request — intent is an enum, not free-form prose."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    calculation_id: str
    intent: AnimationIntent
    character_id: CharacterId = CharacterId.RABBIT
    text: str = ""


class HandoffComposeRequest(BaseModel):
    """Compose a coach reply with optional structured animation intent."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    text: str
    character_id: CharacterId = CharacterId.BOY_COACH
    calculation_id: Optional[str] = None
    animation_intent: Optional[AnimationIntent] = None


class LearningScreen(str, Enum):
    THEORY = "theory"
    PRACTICE = "practice"
    LEARN = "learn"
    HANDOFF = "handoff"


class CoachLearningContext(BaseModel):
    """Structured learning context from the UI (not mathematical authority).

    Client-supplied answer values and claimed correctness are informational only.
    The coach must still use tools / practice engines for verified maths.
    """

    model_config = ConfigDict(extra="forbid")

    screen: LearningScreen
    sutra_id: Optional[str] = None
    difficulty: Optional[str] = None
    problem_label: Optional[str] = None
    step_id: Optional[int] = None
    step_title: Optional[str] = None
    frame_index: Optional[int] = None
    frame_state: Optional[str] = None
    question_key: Optional[str] = None
    # Learner draft / last submission text — never treated as the correct answer.
    learner_answer: Optional[str] = None
    # Deterministic check status from the practice engine (correct/incorrect/invalid).
    check_status: Optional[Literal["correct", "incorrect", "invalid"]] = None
    hint_level: Optional[int] = None
    hint_count: Optional[int] = None


class CoachChatRequest(BaseModel):
    """Learner chat turn for the ADK Coach (Tollgate 6A/6C)."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    message: str = Field(min_length=1, max_length=4000)
    # Structured only — never inferred solely from free-form LLM prose.
    animation_intent: Optional[AnimationIntent] = None
    calculation_id: Optional[str] = None
    context: Optional[CoachLearningContext] = None


class CoachChatResponse(BaseModel):
    """Chat reply envelope: prose + verified refs + backend-owned UI actions."""

    model_config = ConfigDict(extra="forbid")

    ok: Literal[True] = True
    session_id: str
    message: AgentMessage
    calculation: Optional[VerifiedCalculationRef] = None
    actions: list[UiAction] = Field(default_factory=list)
    lesson: Optional[LessonAnimationPayload] = None
    tools_used: list[str] = Field(default_factory=list)

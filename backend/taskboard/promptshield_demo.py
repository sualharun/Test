"""
Deterministic PromptShield-style graph payload for demo playback.

This module is intentionally synthetic and local-only. It does not perform
network calls or LLM usage.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from taskboard.deps import get_current_user
from taskboard.models import User
from taskboard.schemas import (
    PromptShieldChain,
    PromptShieldContextResponse,
    PromptShieldEdge,
    PromptShieldNode,
    PromptShieldPrMeta,
)

router = APIRouter(prefix="/demo/promptshield", tags=["promptshield-demo"])


def _risk_for_edge(source_type: str, target_type: str) -> int:
    weights: dict[tuple[str, str], int] = {
        ("repo", "package"): 20,
        ("package", "maintainer"): 24,
        ("maintainer", "repo"): 36,
        ("package", "repo"): 30,
    }
    return weights.get((source_type, target_type), 10)


def _chain_score(node_ids: list[str], node_type_map: dict[str, str], severities: dict[str, int]) -> int:
    severity_bonus = max((severities.get(nid, 0) for nid in node_ids), default=0)
    edge_risk = 0
    for idx in range(len(node_ids) - 1):
        edge_risk += _risk_for_edge(node_type_map[node_ids[idx]], node_type_map[node_ids[idx + 1]])
    # Deterministic score with slight path-length preference.
    return min(100, edge_risk + severity_bonus + len(node_ids) * 3)


def _ordered_edge_ids(node_ids: list[str]) -> list[str]:
    return [f"{node_ids[i]}->{node_ids[i + 1]}" for i in range(len(node_ids) - 1)]


def _ranked_chains(
    candidate_node_paths: list[list[str]],
    node_type_map: dict[str, str],
    severities: dict[str, int],
) -> list[PromptShieldChain]:
    out: list[PromptShieldChain] = []
    for node_ids in candidate_node_paths:
        terminal_id = node_ids[-1]
        score = _chain_score(node_ids, node_type_map, severities)
        terminal_type = node_type_map[terminal_id]
        out.append(
            PromptShieldChain(
                path=node_ids,
                node_ids=node_ids,
                edge_ids=_ordered_edge_ids(node_ids),
                risk_score=score,
                terminal_type=terminal_type,
                fallback=False,
            )
        )
    out.sort(key=lambda c: (-c.risk_score, -len(c.node_ids), c.node_ids))
    return out


@router.get("/context", response_model=PromptShieldContextResponse)
def get_promptshield_context(current: User = Depends(get_current_user)) -> PromptShieldContextResponse:
    pr_meta = PromptShieldPrMeta(
        repo_full_name="sualharun/Test",
        pr_number=42,
        commit_sha="8f1a6b2c7d4e9f00112233445566778899aabbcc",
        author_login=current.email.split("@")[0],
        pr_title="demo: synthesize multi-repo compromise graph context",
    )

    nodes = [
        PromptShieldNode(
            id="repo:sualharun/Test",
            label="sualharun/Test",
            node_type="repo",
            x=50,
            y=50,
            risk=12,
            metadata={"kind": "first_party"},
        ),
        PromptShieldNode(
            id="pkg:fastapi",
            label="fastapi",
            node_type="package",
            x=260,
            y=16,
            risk=30,
            metadata={"version": "0.115.6"},
        ),
        PromptShieldNode(
            id="pkg:python-jose",
            label="python-jose",
            node_type="package",
            x=260,
            y=84,
            risk=48,
            metadata={"version": "3.3.0"},
        ),
        PromptShieldNode(
            id="pkg:react-router-dom",
            label="react-router-dom",
            node_type="package",
            x=260,
            y=152,
            risk=26,
            metadata={"version": "6.28.0"},
        ),
        PromptShieldNode(
            id="maint:alice",
            label="alice-maintainer",
            node_type="maintainer",
            x=500,
            y=26,
            risk=58,
            metadata={"packages": ["fastapi", "python-jose"]},
        ),
        PromptShieldNode(
            id="maint:bob",
            label="bob-maintainer",
            node_type="maintainer",
            x=500,
            y=140,
            risk=46,
            metadata={"packages": ["react-router-dom"]},
        ),
        PromptShieldNode(
            id="repo:evil/typosquat-fastapi-ext",
            label="evil/typosquat-fastapi-ext",
            node_type="vulnerable_repo",
            x=770,
            y=0,
            risk=92,
            metadata={
                "cve_ids": ["CVE-2026-31001"],
                "severity": "critical",
                "description": "Typosquat backdoor in release automation token flow.",
            },
        ),
        PromptShieldNode(
            id="repo:unknown/jwt-tools",
            label="unknown/jwt-tools",
            node_type="vulnerable_repo",
            x=770,
            y=78,
            risk=84,
            metadata={
                "cve_ids": ["CVE-2025-92311", "CVE-2026-10442"],
                "severity": "high",
                "description": "Maintainer account takeover used to publish malicious helper package.",
            },
        ),
        PromptShieldNode(
            id="repo:ghost/routing-kit",
            label="ghost/routing-kit",
            node_type="vulnerable_repo",
            x=770,
            y=156,
            risk=73,
            metadata={
                "cve_ids": ["CVE-2024-55177"],
                "severity": "high",
                "description": "Prototype pollution payload distributed through transitive plugin.",
            },
        ),
    ]

    edges = [
        PromptShieldEdge(id="repo:sualharun/Test->pkg:fastapi", source="repo:sualharun/Test", target="pkg:fastapi"),
        PromptShieldEdge(
            id="repo:sualharun/Test->pkg:python-jose",
            source="repo:sualharun/Test",
            target="pkg:python-jose",
        ),
        PromptShieldEdge(
            id="repo:sualharun/Test->pkg:react-router-dom",
            source="repo:sualharun/Test",
            target="pkg:react-router-dom",
        ),
        PromptShieldEdge(id="pkg:fastapi->maint:alice", source="pkg:fastapi", target="maint:alice"),
        PromptShieldEdge(id="pkg:python-jose->maint:alice", source="pkg:python-jose", target="maint:alice"),
        PromptShieldEdge(id="pkg:react-router-dom->maint:bob", source="pkg:react-router-dom", target="maint:bob"),
        PromptShieldEdge(
            id="maint:alice->repo:evil/typosquat-fastapi-ext",
            source="maint:alice",
            target="repo:evil/typosquat-fastapi-ext",
        ),
        PromptShieldEdge(id="maint:alice->repo:unknown/jwt-tools", source="maint:alice", target="repo:unknown/jwt-tools"),
        PromptShieldEdge(id="maint:bob->repo:ghost/routing-kit", source="maint:bob", target="repo:ghost/routing-kit"),
    ]

    node_type_map = {n.id: n.node_type for n in nodes}
    severities = {n.id: n.risk for n in nodes}
    candidates = [
        [
            "repo:sualharun/Test",
            "pkg:python-jose",
            "maint:alice",
            "repo:unknown/jwt-tools",
        ],
        [
            "repo:sualharun/Test",
            "pkg:fastapi",
            "maint:alice",
            "repo:evil/typosquat-fastapi-ext",
        ],
        [
            "repo:sualharun/Test",
            "pkg:react-router-dom",
            "maint:bob",
            "repo:ghost/routing-kit",
        ],
    ]

    chains = _ranked_chains(candidates, node_type_map, severities)

    # Always guarantee at least one chain for deterministic playback.
    if not chains:
        fallback_nodes = [
            "repo:sualharun/Test",
            "pkg:python-jose",
            "maint:alice",
            "repo:unknown/jwt-tools",
        ]
        chains = [
            PromptShieldChain(
                path=fallback_nodes,
                node_ids=fallback_nodes,
                edge_ids=_ordered_edge_ids(fallback_nodes),
                risk_score=88,
                terminal_type="vulnerable_repo",
                fallback=True,
            )
        ]

    return PromptShieldContextResponse(
        pr=pr_meta,
        nodes=nodes,
        edges=edges,
        chains=chains,
    )

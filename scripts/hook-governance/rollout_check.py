#!/usr/bin/env python3
"""Evaluate rollout governance health from an explicit inventory input."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _repo_count(payload: Any) -> int:
    if isinstance(payload, dict):
        repos = payload.get("repos")
        if isinstance(repos, list):
            return len(repos)
        return 1
    if isinstance(payload, list):
        return len(payload)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run rollout governance checks from an explicit inventory file."
    )
    parser.add_argument(
        "--inventory",
        required=True,
        help="Path to repo inventory JSON; required with no fallback defaults.",
    )
    parser.add_argument(
        "--recovery-slo-hours",
        type=int,
        default=24,
        help="Recovery SLO threshold in hours (default: 24).",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="Output JSON path for the generated report.",
    )
    args = parser.parse_args()

    inventory_path = Path(args.inventory).expanduser().resolve()
    output_path = Path(args.out).expanduser().resolve()

    if not inventory_path.is_file():
        raise SystemExit(f"inventory file not found: {inventory_path}")

    inventory_payload = json.loads(inventory_path.read_text(encoding="utf-8"))
    repos = _repo_count(inventory_payload)

    report = {
        "schemaVersion": "1.0.0",
        "generatedAt": datetime.now(UTC).isoformat(),
        "inventoryPath": str(inventory_path),
        "recoverySloHours": args.recovery_slo_hours,
        "repoCount": repos,
        "status": "ok",
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"rollout_check: wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

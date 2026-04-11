#!/usr/bin/env python3
"""Evaluate docstring ratchet metrics from explicit input files."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def _count_public_api(payload: Any) -> int:
    if isinstance(payload, dict):
        public_api = payload.get("public_api")
        if isinstance(public_api, list):
            return len(public_api)
        return 0
    if isinstance(payload, list):
        return len(payload)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Evaluate docstring ratchet status from explicit classification and metrics inputs."
        )
    )
    parser.add_argument(
        "--classification",
        required=True,
        help="Path to public API classification JSON; required with no fallback defaults.",
    )
    parser.add_argument(
        "--metrics",
        required=True,
        help="Path to docstring metrics JSON; required with no fallback defaults.",
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=14,
        help="Observation window in days (default: 14).",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="Output JSON path for the generated report.",
    )
    args = parser.parse_args()

    classification_path = Path(args.classification).expanduser().resolve()
    metrics_path = Path(args.metrics).expanduser().resolve()
    output_path = Path(args.out).expanduser().resolve()

    if not classification_path.is_file():
        raise SystemExit(f"classification file not found: {classification_path}")
    if not metrics_path.is_file():
        raise SystemExit(f"metrics file not found: {metrics_path}")

    try:
        classification_payload = json.loads(classification_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"Error: failed to parse JSON from {classification_path}: {e}", file=sys.stderr)
        return 1

    try:
        metrics_payload = json.loads(metrics_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"Error: failed to parse JSON from {metrics_path}: {e}", file=sys.stderr)
        return 1

    report = {
        "schemaVersion": "1.0.0",
        "generatedAt": datetime.now(UTC).isoformat(),
        "classificationPath": str(classification_path),
        "metricsPath": str(metrics_path),
        "windowDays": args.window_days,
        "publicApiCount": _count_public_api(classification_payload),
        "status": "ok",
        "metrics": metrics_payload,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"evaluate_docstring_ratchet: wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
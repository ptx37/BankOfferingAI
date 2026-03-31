#!/usr/bin/env python3
"""
Create Claude Code remote trigger agents for the multi-agent system.
This script sets up remote agents that can be invoked via Claude Code.

NOTE: This requires Claude Code to be installed and authenticated.
"""

import subprocess
import json
import sys
from pathlib import Path
from typing import Dict, List


def run_command(cmd: List[str], check: bool = True) -> Dict:
    """Run command and return result."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=check
        )
        return {
            "success": True,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "stdout": e.stdout,
            "stderr": str(e),
            "returncode": e.returncode
        }


def create_orchestrator_trigger() -> bool:
    """Create orchestrator remote trigger."""
    print("\n→ Creating Orchestrator remote trigger...")

    result = run_command([
        "claude", "remote-trigger", "create",
        "--name", "orchestrator-main",
        "--description", "Main orchestrator for BankOffer AI agent system",
        "--prompt", "Read audit.yaml and dispatch all depth-1 agents. See CLAUDE.md and scripts/orchestrator.py for details."
    ], check=False)

    if result["success"]:
        print("✓ Orchestrator trigger created")
        return True
    else:
        print(f"✗ Failed to create orchestrator trigger: {result['stderr']}")
        return False


def create_agent_triggers() -> bool:
    """Create triggers for all agents."""
    agents = {
        "infra-agent": "Handle infrastructure, Terraform, Helm, ArgoCD. See audit.yaml for tasks.",
        "data-pipeline-agent": "Handle Kafka, Airflow, dbt, feature store. See audit.yaml for tasks.",
        "aiml-agent": "Handle ML models: profiler, scorer, ranker, MLflow config.",
        "api-agent": "Handle FastAPI backend: endpoints, auth, webhooks, OpenAPI spec.",
        "notification-agent": "Handle notifications: push, email, in-app adapters.",
        "gitops-subagent": "Handle GitOps: ArgoCD, Kustomize, Argo Rollouts, image updater.",
        "security-subagent": "Handle security: gitleaks, Trivy, OPA, SBOM, secret rotation.",
        "observability-subagent": "Handle observability: Prometheus, Grafana, Loki, Alertmanager.",
        "testqa-subagent": "Handle testing: pytest, Cypress, k6, Pact contract tests."
    }

    all_success = True

    for trigger_name, description in agents.items():
        print(f"\n→ Creating {trigger_name} trigger...")

        result = run_command([
            "claude", "remote-trigger", "create",
            "--name", trigger_name,
            "--description", description,
            "--prompt", f"Execute tasks for {trigger_name.replace('-', ' ')} from audit.yaml. See CLAUDE.md for detailed instructions."
        ], check=False)

        if result["success"]:
            print(f"✓ {trigger_name} trigger created")
        else:
            print(f"✗ Failed to create {trigger_name}: {result['stderr']}")
            all_success = False

    return all_success


def list_triggers() -> bool:
    """List all created triggers."""
    print("\n→ Listing created triggers...")

    result = run_command([
        "claude", "remote-trigger", "list"
    ], check=False)

    if result["success"]:
        print("\n✓ Remote triggers:")
        print(result["stdout"])
        return True
    else:
        print(f"✗ Failed to list triggers: {result['stderr']}")
        return False


def main():
    """Main entry point."""
    print("\n" + "="*60)
    print("BankOffer AI — Remote Agent Trigger Setup")
    print("="*60)

    # Verify Claude is installed
    result = run_command(["which", "claude"], check=False)
    if not result["success"]:
        print("\n✗ Claude Code CLI not found")
        print("  Install from: https://claude.com/claude-code")
        sys.exit(1)

    print("✓ Claude Code CLI found")

    # Create triggers
    print("\n" + "-"*60)
    print("Creating remote triggers...")
    print("-"*60)

    orchestrator_ok = create_orchestrator_trigger()
    agents_ok = create_agent_triggers()

    # List created triggers
    print("\n" + "-"*60)
    list_triggers()

    # Summary
    print("\n" + "="*60)
    if orchestrator_ok and agents_ok:
        print("✓ All remote triggers created successfully")
        print("\nNext steps:")
        print("  1. Set ANTHROPIC_API_KEY: export ANTHROPIC_API_KEY=sk-...")
        print("  2. Run orchestrator: python3 scripts/orchestrator.py")
        print("  3. Monitor: python3 scripts/agent-cli.py status")
    else:
        print("⚠ Some triggers failed to create")
        print("  Run 'claude remote-trigger list' to see existing triggers")
        sys.exit(1)

    print("="*60 + "\n")


if __name__ == "__main__":
    main()

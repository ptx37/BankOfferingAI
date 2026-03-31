#!/usr/bin/env python3
"""
Orchestrator Agent - Main coordinator for BankOffer AI multi-agent system.
Reads audit.yaml, dispatches depth-1 agents, monitors PR queue, and maintains audit trail.
"""

import yaml
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

class Orchestrator:
    """Main orchestration logic for multi-agent CI/CD system."""

    def __init__(self, repo_root: Path = Path(".")):
        self.repo_root = repo_root
        self.audit_file = repo_root / "audit.yaml"
        self.audit_state = self._load_audit()

    def _load_audit(self) -> Dict:
        """Load and parse audit.yaml."""
        if not self.audit_file.exists():
            raise FileNotFoundError(f"audit.yaml not found at {self.audit_file}")

        with open(self.audit_file) as f:
            return yaml.safe_load(f)

    def _save_audit(self):
        """Write audit state back to audit.yaml."""
        with open(self.audit_file, 'w') as f:
            yaml.dump(self.audit_state, f, default_flow_style=False, sort_keys=False)

        # Commit the audit change
        subprocess.run(
            ["git", "add", "audit.yaml"],
            cwd=self.repo_root,
            check=True
        )

    def dispatch_agent(self, agent_name: str, task_list: List[str]) -> bool:
        """
        Dispatch a depth-1 agent via repository_dispatch.

        Args:
            agent_name: Name of the agent (e.g., 'infra_agent')
            task_list: List of tasks to assign

        Returns:
            True if dispatch succeeded, False otherwise
        """
        event_type = f"agent_{agent_name}"

        payload = {
            "task_list": task_list,
            "audit_ref": "HEAD",
            "branch": f"agent/{agent_name.split('_')[0]}"
        }

        try:
            result = subprocess.run(
                [
                    "gh", "api",
                    f"repos/{self._get_repo_slug()}/dispatches",
                    "-f", f"event_type={event_type}",
                    "-f", f"client_payload={json.dumps(payload)}"
                ],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                check=True
            )

            print(f"✓ Dispatched {agent_name}")
            return True

        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to dispatch {agent_name}: {e.stderr}")
            return False

    def _get_repo_slug(self) -> str:
        """Get GitHub repo slug (owner/repo)."""
        try:
            result = subprocess.run(
                ["git", "config", "--get", "remote.origin.url"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                check=True
            )

            url = result.stdout.strip()
            # Extract owner/repo from git URL
            if url.startswith("https://github.com/"):
                return url.replace("https://github.com/", "").replace(".git", "")
            elif url.startswith("git@github.com:"):
                return url.replace("git@github.com:", "").replace(".git", "")

        except subprocess.CalledProcessError:
            pass

        # Fallback from audit.yaml
        return self.audit_state["meta"]["github_repo"]

    def append_history(self, action: str, agent: str = "orchestrator"):
        """Append an entry to the audit history."""
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=self.repo_root,
            capture_output=True,
            text=True,
            check=True
        ).stdout.strip()

        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent": agent,
            "action": action,
            "ref": "HEAD",
            "sha": sha
        }

        self.audit_state["history"].append(entry)

    def get_agent_status(self, agent_name: str) -> str:
        """Get current status of an agent."""
        return self.audit_state["agents"][agent_name]["status"]

    def set_agent_status(self, agent_name: str, status: str):
        """Update agent status in audit state."""
        self.audit_state["agents"][agent_name]["status"] = status

    def get_pending_agents(self) -> List[str]:
        """Get all agents with pending status."""
        return [
            name for name, state in self.audit_state["agents"].items()
            if state.get("status") == "pending"
        ]

    def execute_dispatch_sequence(self):
        """Execute the main dispatch sequence for depth-1 agents."""
        print("\n" + "="*60)
        print("BankOffer AI — Multi-Agent Orchestration System")
        print("="*60 + "\n")

        # Step 1: Mark orchestrator as active
        self.set_agent_status("orchestrator", "active")

        # Step 2: Dispatch depth-1 agents in order
        dispatch_order = [
            "infra_agent",
            "data_pipeline_agent",
            "aiml_agent",
            "api_agent",
            "notification_agent"
        ]

        for agent_name in dispatch_order:
            agent_config = self.audit_state["agents"][agent_name]
            tasks = agent_config["tasks"]

            print(f"\n→ Dispatching {agent_name}...")
            print(f"  Tasks: {len(tasks)}")
            for task in tasks[:3]:
                print(f"    • {task}")
            if len(tasks) > 3:
                print(f"    ... and {len(tasks) - 3} more")

            if self.dispatch_agent(agent_name, tasks):
                self.set_agent_status(agent_name, "active")
                self.append_history(f"dispatch_{agent_name}")
            else:
                print(f"  ✗ Dispatch failed for {agent_name}")
                self.set_agent_status(agent_name, "blocked")
                return False

        # Step 3: Save audit state
        self._save_audit()

        print("\n" + "="*60)
        print("✓ All depth-1 agents dispatched successfully")
        print("="*60 + "\n")

        return True


def main():
    """Main entry point."""
    try:
        orch = Orchestrator()
        success = orch.execute_dispatch_sequence()
        sys.exit(0 if success else 1)

    except Exception as e:
        print(f"✗ Orchestrator error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Shared utilities for all Claude Code agents.
Handles audit.yaml management, GitHub operations, and common patterns.
"""

import yaml
import json
import subprocess
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any


class AuditManager:
    """Manages audit.yaml state for agents."""

    def __init__(self, repo_root: Optional[Path] = None):
        self.repo_root = repo_root or Path(".")
        self.audit_file = self.repo_root / "audit.yaml"

    def read(self) -> Dict:
        """Read audit.yaml."""
        if not self.audit_file.exists():
            raise FileNotFoundError(f"audit.yaml not found at {self.audit_file}")

        with open(self.audit_file) as f:
            return yaml.safe_load(f)

    def write(self, state: Dict):
        """Write audit.yaml."""
        with open(self.audit_file, 'w') as f:
            yaml.dump(state, f, default_flow_style=False, sort_keys=False)

    def append_history(self, agent: str, action: str, details: Optional[str] = None) -> Dict:
        """Append an entry to audit history."""
        state = self.read()

        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=self.repo_root,
            capture_output=True,
            text=True
        ).stdout.strip()

        entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent": agent,
            "action": action,
            "ref": "HEAD",
            "sha": sha
        }

        if details:
            entry["details"] = details

        state["history"].append(entry)
        self.write(state)

        return entry

    def set_agent_status(self, agent_name: str, status: str):
        """Update agent status."""
        state = self.read()
        state["agents"][agent_name]["status"] = status
        self.write(state)

    def get_agent_state(self, agent_name: str) -> Dict:
        """Get agent configuration from audit state."""
        state = self.read()
        return state["agents"].get(agent_name, {})

    def mark_task_completed(self, agent_name: str, task_name: str):
        """Mark a task as completed."""
        state = self.read()
        agent = state["agents"][agent_name]

        # Move from tasks to tasks_completed if present
        if "tasks" in agent and task_name in agent["tasks"]:
            agent["tasks"].remove(task_name)

        if "tasks_completed" not in agent:
            agent["tasks_completed"] = []

        if task_name not in agent["tasks_completed"]:
            agent["tasks_completed"].append(task_name)

        self.write(state)


class GitHubOperations:
    """GitHub API operations for agents."""

    @staticmethod
    def get_repo_slug() -> str:
        """Get repo slug (owner/repo)."""
        try:
            result = subprocess.run(
                ["gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError:
            return None

    @staticmethod
    def create_pr(
        base: str = "main",
        head: str = None,
        title: str = None,
        body: str = None
    ) -> Optional[str]:
        """
        Create a pull request.

        Returns:
            PR number if successful, None otherwise
        """
        try:
            cmd = ["gh", "pr", "create", "--base", base]

            if head:
                cmd.extend(["--head", head])
            if title:
                cmd.extend(["--title", title])
            if body:
                cmd.extend(["--body", body])

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            # Extract PR number from output
            output = result.stdout.strip()
            if "Opened" in output:
                return output.split("#")[1].split(" ")[0]

            return None

        except subprocess.CalledProcessError as e:
            print(f"Failed to create PR: {e.stderr}")
            return None

    @staticmethod
    def dispatch_subagent(subagent_name: str, task_list: List[str]) -> bool:
        """Dispatch a depth-2 subagent."""
        repo_slug = GitHubOperations.get_repo_slug()

        if not repo_slug:
            print("Failed to get repo slug")
            return False

        event_type = f"agent_{subagent_name}"

        payload = {
            "task_list": task_list,
            "audit_ref": "HEAD",
            "branch": f"sub/{subagent_name.split('_')[0]}"
        }

        try:
            subprocess.run(
                [
                    "gh", "api",
                    f"repos/{repo_slug}/dispatches",
                    "-f", f"event_type={event_type}",
                    "-f", f"client_payload={json.dumps(payload)}"
                ],
                check=True,
                capture_output=True
            )

            return True

        except subprocess.CalledProcessError as e:
            print(f"Failed to dispatch {subagent_name}: {e.stderr}")
            return False

    @staticmethod
    def create_issue(
        title: str,
        body: str = "",
        labels: List[str] = None
    ) -> Optional[str]:
        """Create a GitHub issue."""
        try:
            cmd = ["gh", "issue", "create", "--title", title, "--body", body]

            if labels:
                cmd.extend(["--label", ",".join(labels)])

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            # Extract issue number
            return result.stdout.strip().split("#")[1].split(" ")[0]

        except subprocess.CalledProcessError as e:
            print(f"Failed to create issue: {e.stderr}")
            return None


class Agent:
    """Base agent class with common functionality."""

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.audit = AuditManager()
        self.github = GitHubOperations()
        self.branch_name = self._derive_branch_name()

    def _derive_branch_name(self) -> str:
        """Derive branch name from agent name."""
        if "sub" in self.agent_name:
            return f"sub/{self.agent_name.split('_')[0]}"
        else:
            return f"agent/{self.agent_name.split('_')[0]}"

    def get_tasks(self) -> List[str]:
        """Get task list from audit state."""
        agent_state = self.audit.get_agent_state(self.agent_name)
        return agent_state.get("tasks", [])

    def mark_task_done(self, task_name: str):
        """Mark task as completed."""
        self.audit.mark_task_completed(self.agent_name, task_name)

    def start(self):
        """Mark agent as active."""
        self.audit.set_agent_status(self.agent_name, "active")

    def complete(self):
        """Mark agent as complete."""
        self.audit.set_agent_status(self.agent_name, "complete")

    def block(self, reason: str):
        """Mark agent as blocked due to error."""
        self.audit.set_agent_status(self.agent_name, "blocked")
        self.audit.append_history(
            self.agent_name,
            "blocked",
            details=reason
        )

    def ensure_branch(self):
        """Ensure agent branch exists and is checked out."""
        try:
            # Check if branch exists
            subprocess.run(
                ["git", "rev-parse", "--verify", self.branch_name],
                capture_output=True,
                check=False
            )

            # Try to checkout or create
            result = subprocess.run(
                ["git", "checkout", "-B", self.branch_name, "main"],
                capture_output=True,
                text=True,
                check=True
            )

            return True

        except subprocess.CalledProcessError as e:
            print(f"Failed to ensure branch: {e.stderr}")
            return False

    def commit_changes(self, message: str) -> bool:
        """Commit all changes."""
        try:
            subprocess.run(["git", "add", "-A"], check=True)

            result = subprocess.run(
                ["git", "commit", "-m", message],
                capture_output=True,
                text=True,
                check=True
            )

            return True

        except subprocess.CalledProcessError:
            # No changes to commit
            return True

    def create_pr(self, title: str, body: str = "") -> Optional[str]:
        """Create PR with agent-result YAML block."""
        full_body = body

        # Add agent-result block if not already present
        if "# agent-result" not in body:
            agent_result = f"""
# agent-result
agent: {self.agent_name}
tasks_completed:
{chr(10).join(f'  - {task}' for task in self.get_tasks())}
audit_entry:
  timestamp: "{datetime.utcnow().isoformat() + 'Z'}"
  sha: "{{{{HEAD_SHA}}}}"
  status: complete
"""
            full_body = f"{body}\n\n{agent_result}"

        return self.github.create_pr(
            base="main",
            head=self.branch_name,
            title=title,
            body=full_body
        )


def setup_git_config():
    """Configure git with bot credentials."""
    subprocess.run(
        ["git", "config", "--global", "user.name", "github-actions[bot]"],
        check=True
    )
    subprocess.run(
        ["git", "config", "--global", "user.email", "github-actions[bot]@users.noreply.github.com"],
        check=True
    )

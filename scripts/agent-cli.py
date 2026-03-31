#!/usr/bin/env python3
"""
BankOffer AI Agent CLI
Utility for managing multi-agent system operations.
"""

import argparse
import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import Orchestrator
from agent_utils import AuditManager, GitHubOperations


def cmd_status(args):
    """Show current agent status."""
    audit = AuditManager()
    state = audit.read()

    print("\n" + "="*70)
    print("BankOffer AI — Agent System Status")
    print("="*70 + "\n")

    # Project info
    meta = state["meta"]
    print(f"Project: {meta['project']} v{meta['version']}")
    print(f"Repository: {meta['github_repo']}")
    print(f"GitOps Tool: {meta['gitops_tool']}")
    print(f"Audit Policy: {meta['audit_policy']}\n")

    # Agent status table
    print("AGENT STATUS")
    print("-" * 70)
    print(f"{'Agent Name':<30} {'Status':<15} {'Tasks':<10}")
    print("-" * 70)

    agents = state["agents"]

    for name, config in agents.items():
        status = config.get("status", "unknown")
        depth = config.get("depth", "?")
        tasks = config.get("tasks", [])
        completed = config.get("tasks_completed", [])

        status_color = {
            "active": "🟢",
            "complete": "✅",
            "pending": "⏳",
            "blocked": "🔴",
        }.get(status, "❓")

        task_count = len(tasks) + len(completed)
        progress = f"{len(completed)}/{task_count}" if task_count else "N/A"

        print(f"{status_color} {name:<28} {status:<15} {progress:<10}")

    print("\n" + "="*70 + "\n")

    # Recent history
    print("RECENT HISTORY (last 5 entries)")
    print("-" * 70)

    history = state.get("history", [])
    for entry in history[-5:]:
        timestamp = entry.get("timestamp", "?")
        agent = entry.get("agent", "?")
        action = entry.get("action", "?")
        sha = entry.get("sha", "?")[:8]

        print(f"{timestamp} | {agent:<20} | {action:<30} | {sha}")

    print()


def cmd_dispatch(args):
    """Dispatch all depth-1 agents."""
    orch = Orchestrator()

    if args.agent:
        # Dispatch specific agent
        agent_name = args.agent
        agent_config = orch.audit_state["agents"].get(agent_name)

        if not agent_config:
            print(f"✗ Unknown agent: {agent_name}")
            sys.exit(1)

        tasks = agent_config.get("tasks", [])
        print(f"\nDispatching {agent_name} with {len(tasks)} tasks...")

        if orch.dispatch_agent(agent_name, tasks):
            orch.set_agent_status(agent_name, "active")
            orch.append_history(f"dispatch_{agent_name}")
            orch._save_audit()
            print(f"✓ {agent_name} dispatched successfully")
        else:
            print(f"✗ Failed to dispatch {agent_name}")
            sys.exit(1)

    else:
        # Dispatch all depth-1 agents
        success = orch.execute_dispatch_sequence()
        sys.exit(0 if success else 1)


def cmd_audit(args):
    """Manage audit.yaml."""
    audit = AuditManager()

    if args.action == "read":
        import yaml
        state = audit.read()
        print(yaml.dump(state, default_flow_style=False, sort_keys=False))

    elif args.action == "history":
        state = audit.read()
        history = state.get("history", [])

        limit = args.limit or len(history)
        print(f"\nAudit History (last {limit} entries):\n")
        print(f"{'#':<4} {'Timestamp':<25} {'Agent':<20} {'Action':<30}")
        print("-" * 80)

        for i, entry in enumerate(history[-limit:], 1):
            timestamp = entry.get("timestamp", "?")
            agent = entry.get("agent", "?")
            action = entry.get("action", "?")
            print(f"{i:<4} {timestamp:<25} {agent:<20} {action:<30}")
        print()

    elif args.action == "append":
        if not args.message:
            print("✗ --message required")
            sys.exit(1)

        audit.append_history("cli", args.message)
        print(f"✓ Appended to history: {args.message}")


def cmd_pr(args):
    """Monitor and manage PRs."""
    github = GitHubOperations()

    if args.action == "list":
        import subprocess
        result = subprocess.run(
            ["gh", "pr", "list", "--state", "open", "--json", "number,title,headRefName"],
            capture_output=True,
            text=True,
            check=True
        )

        print("\nOpen Pull Requests:\n")
        print(result.stdout)

    elif args.action == "merge":
        if not args.pr:
            print("✗ --pr number required")
            sys.exit(1)

        import subprocess
        result = subprocess.run(
            ["gh", "pr", "merge", args.pr, "--squash"],
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            print(f"✓ Merged PR #{args.pr}")
        else:
            print(f"✗ Failed to merge PR #{args.pr}: {result.stderr}")
            sys.exit(1)


def cmd_issues(args):
    """Create issue for agent blocker."""
    github = GitHubOperations()

    if args.action == "create":
        if not args.agent or not args.reason:
            print("✗ --agent and --reason required")
            sys.exit(1)

        title = f"Agent blocked: {args.agent}"
        body = f"""
Agent `{args.agent}` has been blocked.

**Reason:**
{args.reason}

**Action:**
Check audit.yaml history section for details. Unblock and retry when issue is resolved.
"""

        issue_id = github.create_issue(title, body, labels=["agent-blocked"])

        if issue_id:
            print(f"✓ Created issue #{issue_id}")
        else:
            print("✗ Failed to create issue")
            sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="BankOffer AI Multi-Agent System CLI"
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # status command
    subparsers.add_parser("status", help="Show agent system status")

    # dispatch command
    dispatch_parser = subparsers.add_parser("dispatch", help="Dispatch agent(s)")
    dispatch_parser.add_argument("--agent", help="Specific agent to dispatch")

    # audit command
    audit_parser = subparsers.add_parser("audit", help="Manage audit.yaml")
    audit_parser.add_argument(
        "action",
        choices=["read", "history", "append"],
        help="Audit action"
    )
    audit_parser.add_argument("--message", help="Message to append")
    audit_parser.add_argument("--limit", type=int, help="Limit for history")

    # pr command
    pr_parser = subparsers.add_parser("pr", help="Manage pull requests")
    pr_parser.add_argument(
        "action",
        choices=["list", "merge"],
        help="PR action"
    )
    pr_parser.add_argument("--pr", type=int, help="PR number for merge")

    # issues command
    issues_parser = subparsers.add_parser("issues", help="Create issue")
    issues_parser.add_argument(
        "action",
        choices=["create"],
        help="Issue action"
    )
    issues_parser.add_argument("--agent", help="Agent name")
    issues_parser.add_argument("--reason", help="Reason for issue")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    try:
        if args.command == "status":
            cmd_status(args)
        elif args.command == "dispatch":
            cmd_dispatch(args)
        elif args.command == "audit":
            cmd_audit(args)
        elif args.command == "pr":
            cmd_pr(args)
        elif args.command == "issues":
            cmd_issues(args)

    except KeyboardInterrupt:
        print("\n\nAborted by user")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

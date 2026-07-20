"""
EKIP Multi-Agent Workflow Graph Assembly

Compile the LangGraph StateGraph connecting Supervisor, Search, Knowledge Graph,
Reasoning, and Report agents.
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.knowledge_graph.agent import kg_agent_node
from app.agents.reasoning.agent import reasoning_node
from app.agents.report.agent import report_node
from app.agents.search.agent import search_agent_node
from app.agents.state import EKIPState
from app.agents.supervisor.agent import route_from_supervisor, supervisor_node


def build_ekip_graph() -> Any:
    """
    Build and compile the EKIP multi-agent LangGraph StateGraph.
    """
    graph = StateGraph(EKIPState)

    # Add agent nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("search_agent", search_agent_node)
    graph.add_node("kg_agent", kg_agent_node)
    graph.add_node("reasoning", reasoning_node)
    graph.add_node("report", report_node)

    # Entry point
    graph.add_edge(START, "supervisor")

    # Supervisor conditional routing
    graph.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "search_agent": "search_agent",
            "kg_agent": "kg_agent",
            "reasoning": "reasoning",
            "report": "report",
            "done": END,
        },
    )

    # Workers loop back to Supervisor for next orchestration step
    graph.add_edge("search_agent", "supervisor")
    graph.add_edge("kg_agent", "supervisor")

    # Reasoning and Report sequence
    graph.add_edge("reasoning", "report")
    graph.add_edge("report", END)

    return graph.compile()

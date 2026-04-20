"""
Report Generator — renders assessment results into HTML / PDF reports.
"""

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path

from app.models.schemas import AssessmentReport, MigrationDifficulty

TEMPLATE_DIR = Path(__file__).parent / "templates"


def render_html_report(report: AssessmentReport) -> str:
    """Render the assessment report as HTML."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
    )
    template = env.get_template("report.html")

    # Prepare difficulty color mapping
    difficulty_colors = {
        MigrationDifficulty.EASY: "#52c41a",
        MigrationDifficulty.MODERATE: "#faad14",
        MigrationDifficulty.HARD: "#ff4d4f",
        MigrationDifficulty.NOT_SUPPORTED: "#8c8c8c",
        MigrationDifficulty.NEEDS_REVIEW: "#1890ff",
    }

    difficulty_labels = {
        MigrationDifficulty.EASY: "Easy Transfer",
        MigrationDifficulty.MODERATE: "Moderate — Some Reconfiguration",
        MigrationDifficulty.HARD: "Hard — Requires Redeployment",
        MigrationDifficulty.NOT_SUPPORTED: "Not Supported in CSP",
        MigrationDifficulty.NEEDS_REVIEW: "Needs Manual Review",
    }

    return template.render(
        report=report,
        difficulty_colors=difficulty_colors,
        difficulty_labels=difficulty_labels,
    )


def render_pdf_report(report: AssessmentReport) -> bytes:
    """Render the assessment report as PDF using WeasyPrint."""
    try:
        from weasyprint import HTML
        html_content = render_html_report(report)
        pdf_bytes = HTML(string=html_content).write_pdf()
        return pdf_bytes
    except ImportError:
        raise RuntimeError(
            "WeasyPrint is not installed. Install it with: pip install weasyprint"
        )

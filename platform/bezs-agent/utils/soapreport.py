import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors


class SOAPReportGenerator:
    """
    Class-based SOAP report generator.
    Loads patient info from dict and creates PDF reports.
    """

    def __init__(self, patient_info):
        self.personal_info = patient_info

        # Styles
        self.styles = getSampleStyleSheet()

        self.header_style = ParagraphStyle(
            name="Header",
            fontSize=18,
            leading=22,
            spaceAfter=12,
            textColor=colors.HexColor("#003366"),
            fontName="Helvetica-Bold",
        )

        self.section_style = ParagraphStyle(
            name="Section",
            fontSize=14,
            leading=18,
            spaceBefore=12,
            spaceAfter=6,
            textColor=colors.HexColor("#003399"),
            fontName="Helvetica-Bold",
        )

        self.normal_style = self.styles["Normal"]

    def build_patient_info_table(self, summary_data):
        """Construct patient details table at top of PDF."""

        patient_info_table = [
            ["Name", self.personal_info.get("name", "")],
            ["Age", self.personal_info.get("age", "")],
            ["Gender", self.personal_info.get("gender", "")],
            ["Report Date", summary_data.get("date", "")],
        ]

        table = Table(patient_info_table, colWidths=[120, 300])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                    ("BOX", (0, 0), (-1, -1), 1, colors.black),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                ]
            )
        )
        return table

    def split_into_bullets(self, text):
        """
        Safely split text into bullet lines WITHOUT breaking hyphenated words.
        Only split on newline or existing bullet symbols.
        """

        # If text includes bullets, split on that first
        if "•" in text:
            raw_lines = text.split("•")
        else:
            raw_lines = text.split("\n")  # SAFE split

        lines = []
        for line in raw_lines:
            clean = line.strip()
            if clean:
                lines.append(clean)

        return lines

    def generate(self, summary_data, output_file="soap_report.pdf"):
        """
        Generate the PDF from parsed SOAP sections.
        summary_data must contain: subjective, objective, assessment, plan, date
        """

        pdf = SimpleDocTemplate(output_file, pagesize=A4)
        content = []

        # Header
        content.append(Paragraph("Medical SOAP Report", self.header_style))
        content.append(Spacer(1, 12))

        # Patient Info Table
        content.append(self.build_patient_info_table(summary_data))
        content.append(Spacer(1, 18))

        # SOAP SECTIONS
        for sec in ["subjective", "objective", "assessment", "plan"]:
            content.append(Paragraph(sec.capitalize(), self.section_style))

            text = summary_data.get(sec, "Not provided")

            # Get clean bullet lines
            lines = self.split_into_bullets(text)

            # Add bullet list
            for line in lines:
                bullet = f"• {line}"
                content.append(Paragraph(bullet, self.normal_style))

            content.append(Spacer(1, 12))

        # Build PDF finally
        pdf.build(content)
        return output_file
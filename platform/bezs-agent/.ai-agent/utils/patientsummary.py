from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors


class PatientSummaryReportGenerator:
    """
    Generates a simple, patient-friendly summary PDF.
    """

    def __init__(self, patient_info):
        self.patient_info = patient_info
        self.styles = getSampleStyleSheet()

        self.header = ParagraphStyle(
            name="Header",
            fontSize=18,
            textColor=colors.HexColor("#003366"),
            spaceAfter=12,
            fontName="Helvetica-Bold",
        )

        self.normal = ParagraphStyle(
            name="Normal",
            fontSize=11,
            leading=14,
        )

    def generate(self, summary_text: str, output_file: str):
        pdf = SimpleDocTemplate(output_file, pagesize=A4)
        content = []

        # Header
        content.append(Paragraph("Patient Visit Summary", self.header))
        content.append(Spacer(1, 12))

        # Patient Info
        for key in ["name", "age", "gender", "patient_id"]:
            value = self.patient_info.get(key, "N/A")
            content.append(Paragraph(f"<b>{key.capitalize()}:</b> {value}", self.normal))

        content.append(Spacer(1, 14))

        # Summary
        content.append(Paragraph("<b>Visit Summary</b>", self.normal))
        content.append(Spacer(1, 8))
        content.append(Paragraph(summary_text, self.normal))

        pdf.build(content)
        return output_file
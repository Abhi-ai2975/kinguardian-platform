from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors
from xml.sax.saxutils import escape

class AssessmentPlanReportGenerator:
    """
    Generates doctor-facing Assessment & Plan PDF.
    """

    def __init__(self, patient_info):
        self.patient_info = patient_info
        self.styles = getSampleStyleSheet()

        self.header_style = ParagraphStyle(
            name="Header",
            fontSize=18,
            textColor=colors.HexColor("#003366"),
            fontName="Helvetica-Bold",
            spaceAfter=12
        )

        self.section_style = ParagraphStyle(
            name="Section",
            fontSize=13,
            textColor=colors.HexColor("#003399"),
            fontName="Helvetica-Bold",
            spaceBefore=10,
            spaceAfter=6
        )

        self.normal_style = ParagraphStyle(
            name="Normal",
            fontSize=11,
            leading=14
        )

    def generate(self, assessment_text: str, output_file: str):
        pdf = SimpleDocTemplate(output_file, pagesize=A4)
        content = []

        # Header
        content.append(Paragraph("Assessment & Plan", self.header_style))
        content.append(Spacer(1, 12))

        # Patient Info
        for key in ["name", "age", "gender", "patient_id"]:
            val = self.patient_info.get(key, "N/A")
            content.append(Paragraph(f"<b>{key.capitalize()}:</b> {val}", self.normal_style))

        content.append(Spacer(1, 14))

        # Assessment text (Safety Fix: Escape XML characters)
        for line in assessment_text.split("\n"):
            if not line.strip():
                content.append(Spacer(1, 6))
                continue
            
            # This prevents ReportLab from crashing on special characters
            safe_line = escape(line.strip())
            content.append(Paragraph(safe_line, self.normal_style))

        pdf.build(content)
        return output_file
    
    # def generate(self, assessment_text: str, output_file: str):
    #     pdf = SimpleDocTemplate(output_file, pagesize=A4)
    #     content = []

    #     # Header
    #     content.append(Paragraph("Assessment & Plan", self.header_style))
    #     content.append(Spacer(1, 12))

    #     # Patient Info
    #     for key in ["name", "age", "gender", "patient_id"]:
    #         val = self.patient_info.get(key, "N/A")
    #         content.append(Paragraph(f"<b>{key.capitalize()}:</b> {val}", self.normal_style))

    #     content.append(Spacer(1, 14))

    #     # Assessment text (preserve formatting)
    #     for line in assessment_text.split("\n"):
    #         if not line.strip():
    #             content.append(Spacer(1, 6))
    #             continue

    #         content.append(Paragraph(line, self.normal_style))

    #     pdf.build(content)
    #     return output_file
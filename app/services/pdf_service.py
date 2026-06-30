from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import cm
import io
import logging

log = logging.getLogger("doctorsmile.pdf_service")

class PDFReportService:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='DS_Title',
            parent=self.styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor("#7C3AED")
        ))
        self.styles.add(ParagraphStyle(
            name='DS_Heading2',
            parent=self.styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=18,
            spaceBefore=20,
            spaceAfter=12,
            textColor=colors.HexColor("#0D0D1F")
        ))
        self.styles.add(ParagraphStyle(
            name='DS_Normal',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            leading=14,
            spaceAfter=10
        ))

    def generate_report(self, data: dict) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        elements = []

        # Header
        elements.append(Paragraph("DOCTOR SMILE - Rapport d'Analyse Financière", self.styles['DS_Title']))
        
        meta = data.get("metadata", {})
        elements.append(Paragraph(f"Entreprise : <b>{meta.get('entreprise', 'N/A')}</b>", self.styles['DS_Normal']))
        elements.append(Paragraph(f"Date d'analyse : {meta.get('date', 'N/A')}", self.styles['DS_Normal']))
        elements.append(Paragraph(f"<b>Score de Santé : {meta.get('score', 'N/A')}/100</b>", self.styles['DS_Normal']))
        elements.append(Spacer(1, 1*cm))

        # Ratios Table
        elements.append(Paragraph("Analyse des Ratios Financiers", self.styles['DS_Heading2']))
        ratios = data.get("ratios", [])
        if ratios:
            table_data = [["Ratio", "Valeur", "Benchmark", "Statut"]]
            for r in ratios:
                status = "OK" if r.get("status") == "green" else "Vigilance" if r.get("status") == "yellow" else "Critique"
                table_data.append([
                    r.get("name", "N/A"),
                    f"{r.get('value', 'N/A')}{r.get('unit', '')}",
                    r.get("benchmark", "N/A"),
                    status
                ])
            
            t = Table(table_data, colWidths=[6*cm, 3*cm, 4*cm, 3*cm])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#7C3AED")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#F1F0FF")),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#D1D1D1"))
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("Aucun ratio disponible.", self.styles['DS_Normal']))

        elements.append(Spacer(1, 1*cm))

        # Recommendations
        elements.append(Paragraph("Recommandations Stratégiques", self.styles['DS_Heading2']))
        recos = data.get("recommandations", [])
        if recos:
            for r in recos:
                title = r.get("title") or r.get("t", "N/A")
                desc = r.get("description") or r.get("d", "")
                elements.append(Paragraph(f"• <b>{title}</b>", self.styles['DS_Normal']))
                if desc:
                    elements.append(Paragraph(f"  {desc}", self.styles['DS_Normal']))
        else:
            elements.append(Paragraph("Aucune recommandation disponible.", self.styles['DS_Normal']))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

pdf_service = PDFReportService()

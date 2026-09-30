import os
import tempfile
import fitz  # PyMuPDF
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from nlp_engine import analyze_contract
from xhtml2pdf import pisa

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

@app.route('/api/analyze', methods=['POST'])
def analyze():
    text = ""
    
    # 1. Check if a file was uploaded
    if 'file' in request.files:
        file = request.files['file']
        if file.filename != '':
            if file.filename.lower().endswith('.pdf'):
                # Extract text from PDF using PyMuPDF
                try:
                    pdf_doc = fitz.open(stream=file.read(), filetype="pdf")
                    for page in pdf_doc:
                        text += page.get_text() + "\n\n"
                except Exception as e:
                    return jsonify({"error": f"Failed to parse PDF: {str(e)}"}), 400
            elif file.filename.lower().endswith('.txt'):
                text = file.read().decode('utf-8')
            else:
                return jsonify({"error": "Unsupported file type. Please upload a PDF or TXT file."}), 400
    
    # 2. Check if raw text was sent via form or JSON
    if not text:
        if request.is_json:
            data = request.get_json()
            text = data.get('text', '')
        else:
            text = request.form.get('text', '')
            
    if not text or not text.strip():
         return jsonify({"error": "No text or file provided."}), 400
         
    try:
        results = analyze_contract(text)
        results['original_text'] = text 
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/export-pdf', methods=['POST'])
def export_pdf():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # Build HTML for PDF
        html_content = f"""
        <html>
        <head>
            <style>
                @page {{
                    size: A4;
                    margin: 1.5cm;
                    @frame footer_frame {{
                        -pdf-frame-content: footer_content;
                        left: 50pt; width: 512pt; top: 772pt; height: 20pt;
                    }}
                }}
                body {{ font-family: Helvetica, sans-serif; font-size: 11pt; color: #333333; line-height: 1.5; }}
                h1 {{ font-size: 20pt; color: #1e3a8a; text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; margin-bottom: 20px; }}
                h2 {{ font-size: 14pt; color: #2563eb; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }}
                h3 {{ font-size: 12pt; color: #475569; margin-top: 20px; }}
                .original-text {{ font-size: 9pt; color: #475569; line-height: 1.4; padding: 15px; background-color: #f8fafc; border-left: 4px solid #94a3b8; word-wrap: break-word; }}
                .content-box {{ background-color: #f8fafc; padding: 15px; border-left: 4px solid #94a3b8; margin-bottom: 15px; }}
                .score-text {{ font-size: 14pt; font-weight: bold; color: {'#ef4444' if data.get('overall_risk_score', 0) > 60 else '#eab308' if data.get('overall_risk_score', 0) > 30 else '#22c55e'}; }}
                .risk-box {{ background-color: #fef2f2; padding: 12px; border-left: 4px solid #ef4444; margin-bottom: 15px; }}
                .risk-title {{ color: #b91c1c; font-size: 12pt; font-weight: bold; margin-bottom: 5px; }}
                .risk-excerpt {{ font-size: 10pt; font-style: italic; color: #7f1d1d; margin-bottom: 8px; }}
                .mitigation-box {{ background-color: #eff6ff; padding: 10px; border-left: 3px solid #3b82f6; }}
                .mitigation-title {{ color: #1d4ed8; font-weight: bold; font-size: 10pt; margin-bottom: 3px; }}
                .mitigation-text {{ font-size: 10pt; color: #1e3a8a; }}
                .obligation-list {{ margin-left: 20px; }}
                .obligation-list li {{ margin-bottom: 8px; }}
                table.favorability-table {{ width: 100%; margin-top: 10px; border-collapse: collapse; }}
                table.favorability-table td {{ padding: 5px; border-bottom: 1px solid #e2e8f0; }}
                .fav-label {{ font-weight: bold; color: #475569; width: 40%; }}
                .fav-value {{ color: #0f172a; }}
                .page-break {{ page-break-before: always; }}
            </style>
        </head>
        <body>
            <div id="footer_content" style="text-align: right; font-size: 8pt; color: #94a3b8;">
                Page <pdf:pagenumber> of <pdf:pagecount>
            </div>
            
            <h1>LCCE Contract Analysis Report</h1>
            
            <h2>1. Executive Summary</h2>
            <div class="content-box">
                {data.get('summary', 'No summary available.')}
            </div>
            
            <h2>2. Intelligence Dashboard</h2>
            <div class="content-box">
                <p><strong>Overall Risk Score:</strong> <span class="score-text">{data.get('overall_risk_score', 'N/A')}/100</span></p>
                <p style="font-size: 9pt; color: #64748b;">(0 = Safe, 100 = Extremely Predatory)</p>
                
                <h3 style="margin-top: 15px; margin-bottom: 5px;">Favorability Analysis (1-10)</h3>
                <table class="favorability-table">
                    <tr>
                        <td class="fav-label">Liability</td>
                        <td class="fav-value">{data.get('favorability', {}).get('liability', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="fav-label">IP Rights</td>
                        <td class="fav-value">{data.get('favorability', {}).get('ip_rights', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="fav-label">Financials</td>
                        <td class="fav-value">{data.get('favorability', {}).get('financials', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="fav-label">Termination</td>
                        <td class="fav-value">{data.get('favorability', {}).get('termination', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td class="fav-label">Confidentiality</td>
                        <td class="fav-value">{data.get('favorability', {}).get('confidentiality', 'N/A')}</td>
                    </tr>
                </table>
            </div>
            
            <h2>3. Critical Risks Detected</h2>
        """
        
        risks = data.get('risks', [])
        if risks:
            for r in risks:
                html_content += f"""
                <div class="risk-box">
                    <div class="risk-title">{r.get('risk_type')}</div>
                    <div class="risk-excerpt">"{r.get('excerpt')}"</div>
                    <div class="mitigation-box">
                        <div class="mitigation-title">Mitigation Strategy</div>
                        <div class="mitigation-text">{r.get('mitigation_strategy', 'Review carefully.')}</div>
                    </div>
                </div>
                """
        else:
            html_content += "<p>No critical risks detected.</p>"
            
        html_content += "<div class='page-break'></div>"
            
        html_content += "<h2>4. Binding Obligations</h2><ul class='obligation-list'>"
        obs = data.get('obligations', [])
        if obs:
            for o in obs:
                html_content += f"<li>{o}</li>"
        else:
            html_content += "<li>No strict obligations detected.</li>"
        html_content += "</ul>"
        
        html_content += "<h2>5. Categorized Clauses</h2>"
        clauses = data.get('clauses', {})
        for c_type, c_text in clauses.items():
            if c_text:
                html_content += f"<h3>{c_type}</h3>"
                html_content += f"<div class='content-box'>{c_text.replace(chr(10), '<br>')}</div>"
                
        html_content += "<div class='page-break'></div>"
                
        html_content += f"""
            <h2>6. Original Source Document</h2>
            <div class="original-text">
                {data.get('original_text', '').replace(chr(10), '<br>')}
            </div>
        </body>
        </html>
        """
        
        temp_dir = tempfile.gettempdir()
        pdf_path = os.path.join(temp_dir, "LCCE_Report.pdf")
        
        with open(pdf_path, "w+b") as result_file:
            pisa_status = pisa.CreatePDF(html_content, dest=result_file)
            
        if pisa_status.err:
            return jsonify({"error": "Failed to generate PDF"}), 500
            
        return send_file(pdf_path, as_attachment=True, download_name="LCCE_Analysis_Report.pdf")
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

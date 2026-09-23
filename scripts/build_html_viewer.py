from pathlib import Path

svg_path = Path("kinguardian_database_er_diagram.svg")
html_path = Path("kinguardian_database_er_diagram.html")

svg_code = svg_path.read_text(encoding="utf-8")

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KinGuardian — Database ER Diagram (19 Tables • Full Schema Verified)</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }}
    header {{
      background: #1e293b;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
      z-index: 10;
    }}
    .header-left {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .badge {{
      background: #10b981;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    h1 {{
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
    }}
    .controls {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .btn {{
      background: #334155;
      color: #f8fafc;
      border: 1px solid #475569;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }}
    .btn:hover {{
      background: #475569;
    }}
    .btn-primary {{
      background: #2563eb;
      border-color: #3b82f6;
    }}
    .btn-primary:hover {{
      background: #1d4ed8;
    }}
    #viewport {{
      flex: 1;
      position: relative;
      overflow: auto;
      background: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 30px;
    }}
    #diagram-container {{
      transform-origin: top center;
      transition: transform 0.12s ease-out;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      background: #ffffff;
      overflow: visible;
      padding: 10px;
    }}
    svg {{
      display: block;
      width: 1720px;
      height: 1420px;
    }}
  </style>
</head>
<body>
  <header>
    <div class="header-left">
      <span class="badge">PostgreSQL 16 Verified</span>
      <h1>KinGuardian — Production Database ER Diagram (19 Normalized Tables)</h1>
    </div>
    <div class="controls">
      <button class="btn" onclick="zoomIn()">Zoom In (+)</button>
      <button class="btn" onclick="zoomOut()">Zoom Out (-)</button>
      <button class="btn" onclick="resetZoom()">Reset</button>
      <button class="btn btn-primary" onclick="window.print()">Print / PDF</button>
    </div>
  </header>

  <div id="viewport">
    <div id="diagram-container">
      {svg_code}
    </div>
  </div>

  <script>
    let scale = 1;
    const container = document.getElementById('diagram-container');

    function updateTransform() {{
      container.style.transform = `scale(${{scale}})`;
    }}

    function zoomIn() {{
      scale = Math.min(scale + 0.15, 2.5);
      updateTransform();
    }}

    function zoomOut() {{
      scale = Math.max(scale - 0.15, 0.4);
      updateTransform();
    }}

    function resetZoom() {{
      scale = 1;
      updateTransform();
    }}
  </script>
</body>
</html>
"""

html_path.write_text(html_content, encoding="utf-8")
print("Saved inline SVG HTML viewer successfully!")

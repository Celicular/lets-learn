export function cleanMarkdownTables(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let inTable = false;
  let headerSeen = false;
  
  const cleaned = lines.filter((line, index) => {
    const isRow = line.trim().startsWith('|');
    const isSeparator = /^\|[-\s\|:]+\|$/.test(line.trim());
    
    if (isRow) {
      if (!inTable) {
        inTable = true;
        headerSeen = false;
        return true;
      } else {
        if (isSeparator) {
          if (!headerSeen) {
            headerSeen = true;
            return true; // Keep the legitimate header separator
          }
          return false; // Drop additional, malformed separators (like at the bottom)
        }
        return true;
      }
    } else {
      inTable = false;
      return true;
    }
  });

  return cleaned.join('\n');
}

export function printHTMLContent(contentId, title) {
  const element = document.getElementById(contentId);
  if (!element) return;

  const htmlContent = element.innerHTML;
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  // Inject the HTML and minimal styling to match the in-app typography
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
          
          body { 
            font-family: 'Inter', system-ui, sans-serif; 
            padding: 40px; 
            color: #1e293b; 
            background: #ffffff;
            margin: 0;
          }
          
          .print-container { 
            max-width: 800px; 
            margin: 0 auto; 
            line-height: 1.6; 
          }
          
          /* Prose Overrides */
          h1, h2, h3, h4 { color: #0f172a; margin-top: 2em; margin-bottom: 0.5em; font-weight: 900; }
          h1 { font-size: 2.25rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5em; }
          h2 { font-size: 1.5rem; }
          h3 { font-size: 1.25rem; }
          
          p, ul, ol, table, pre, blockquote { margin-bottom: 1.5em; }
          
          ul { list-style-type: disc; padding-left: 2rem; margin-bottom: 1.25em; }
          ul li { margin-bottom: 0.5em; }
          ol { list-style-type: decimal; padding-left: 2rem; margin-bottom: 1.25em; }
          ol li { margin-bottom: 0.5em; }
          
          /* Table Styles */
          table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-top: 1.5em; margin-bottom: 1.5em; }
          th, td { padding: 0.75rem 1rem; border: 1px solid #e2e8f0; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; border-bottom: 2px solid #cbd5e1; }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          /* Code Styles */
          code { background-color: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; font-size: 0.9em; font-weight: bold; color: #5B5FEF; }
          pre { background-color: #0f172a; color: #e2e8f0; padding: 1.25rem; border-radius: 12px; font-family: monospace; font-size: 0.9em; overflow-x: auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          pre code { background: transparent; padding: 0; color: inherit; font-weight: 500; }
          
          strong { font-weight: bold; color: #0f172a; }
          em { font-style: italic; }
          
          /* Print Media Queries */
          @media print {
            body { padding: 0; }
            .print-container { max-width: 100%; }
            pre { border: 1px solid #cbd5e1; white-space: pre-wrap; word-break: break-word; }
            table { page-break-inside: auto; border: 1px solid #cbd5e1; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            h1, h2, h3 { page-break-after: avoid; }
            img { max-width: 100%; page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${htmlContent}
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 500); // Short delay to ensure fonts and styles are applied before printing
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

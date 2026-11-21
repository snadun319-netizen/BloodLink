// src/shared/pdf/pdfTemplates.ts
//
// Pure HTML template builders for on-device PDF generation.
// No imports from react-native, expo, or any third-party package, so the
// functions can be unit tested with plain Node.
// All inputs are sanitised with escapeHtml before being inserted into markup.

// --- Types -------------------------------------------------------------------

export interface CertificateData {
  donorName: string;
  hospitalName: string;
  donatedAt: string;    // "2024-05-15" or a formatted date such as "15 May 2024"
  donationType: string;
  volumeMl: number | null | undefined;
  bloodGroup: string;
  donationId: string;   // raw id such as "don-003"
  isMock: boolean;
}

export interface LabReportData {
  donorName: string;
  donationDate: string;  // ISO or formatted date string
  reportedBy: string;    // notification.subtitle shown as one line
  hemoglobin: string;
  volumeMl: number | null | undefined;
  infectiousDiseases: string;
  allClear: boolean;
  doctorMessage: string;
  isMock: boolean;
}

// --- Helpers -----------------------------------------------------------------

/** Escapes characters that are unsafe in HTML text nodes and attributes. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Returns "-" for empty, null, undefined or whitespace-only strings. */
function safeStr(value: string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : '-';
}

/** Returns "-" for null, undefined, NaN or non-finite numbers. */
function safeNum(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return '-';
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return `${value} ${unit}`;
}

/**
 * Builds the certificate reference from the donation id and the donation year.
 * Example: id "don-003", date "2024-05-15" or "15 May 2024" -> "BL-2024-0003".
 * Uses no current date, so the result is the same on every device and day.
 */
export function buildCertificateRef(donationId: string, donatedAt: string): string {
  const yearMatch = String(donatedAt).match(/\b(\d{4})\b/);
  const year = yearMatch ? yearMatch[1] : '0000';

  const numMatch = String(donationId).match(/(\d+)$/);
  const num = numMatch ? parseInt(numMatch[1], 10) : 0;

  return `BL-${year}-${String(num).padStart(4, '0')}`;
}

// --- Certificate HTML --------------------------------------------------------

/** Builds a landscape A4 "Certificate of Appreciation" HTML document. */
export function buildCertificateHtml(data: CertificateData): string {
  const rawName = safeStr(data.donorName);
  const name = rawName === '-' ? 'Valued Donor' : escapeHtml(rawName);
  const hospital = escapeHtml(safeStr(data.hospitalName));
  const date = escapeHtml(safeStr(data.donatedAt));
  const type = escapeHtml(safeStr(data.donationType));
  const volume = escapeHtml(safeNum(data.volumeMl, 'mL'));
  const bloodGroup = escapeHtml(safeStr(data.bloodGroup));
  const rawId = safeStr(data.donationId);
  const ref = rawId === '-'
    ? '-'
    : escapeHtml(buildCertificateRef(rawId, safeStr(data.donatedAt)));

  const mockBanner = data.isMock
    ? `<div class="mock-banner">SAMPLE DATA - demo only</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 297mm;
    height: 209mm;
    overflow: hidden;
  }
  body {
    background: #FDFAF5;
    font-family: Georgia, 'Times New Roman', serif;
    color: #0F172A;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mock-banner {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: #FDE68A;
    color: #92400E;
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    font-weight: bold;
    padding: 4px 0;
    letter-spacing: 0.08em;
    z-index: 100;
  }
  .outer {
    width: 275mm;
    height: 190mm;
    border: 3px double #C5162E;
    padding: 6mm;
    position: relative;
    background: #FDFAF5;
  }
  .inner {
    width: 100%;
    height: 100%;
    border: 1px solid #C5162E;
    padding: 10mm 14mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    position: relative;
  }
  /* Corner marks drawn with borders, so no special font glyphs are needed */
  .corner { position: absolute; width: 9mm; height: 9mm; border: 2px solid #C5162E; }
  .corner.tl { top: 3mm; left: 3mm; border-right: none; border-bottom: none; }
  .corner.tr { top: 3mm; right: 3mm; border-left: none; border-bottom: none; }
  .corner.bl { bottom: 3mm; left: 3mm; border-right: none; border-top: none; }
  .corner.br { bottom: 3mm; right: 3mm; border-left: none; border-top: none; }
  .header { text-align: center; }
  .bloodlink-name {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    font-weight: bold;
    color: #C5162E;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .drop-svg { margin-right: 6px; }
  .cert-title {
    font-size: 26pt;
    font-weight: bold;
    color: #0F172A;
    letter-spacing: 0.04em;
    margin-top: 2mm;
    line-height: 1.1;
  }
  .rule {
    width: 60mm;
    height: 1px;
    background: #C5162E;
    margin: 3mm auto;
  }
  .body { text-align: center; }
  .presented-to {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #64748B;
    letter-spacing: 0.06em;
  }
  .donor-name {
    font-size: 30pt;
    color: #C5162E;
    font-style: italic;
    line-height: 1.15;
    margin: 2mm 0;
    max-width: 235mm;
    overflow-wrap: anywhere;
  }
  .recognition {
    font-size: 11pt;
    color: #0F172A;
    line-height: 1.6;
    max-width: 180mm;
  }
  .details {
    display: flex;
    justify-content: center;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
  }
  .detail-item { text-align: center; margin: 0 5mm; }
  .detail-label { color: #64748B; font-size: 8pt; }
  .detail-value { color: #0F172A; font-weight: bold; margin-top: 0.5mm; }
  .ref-line {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 8pt;
    color: #64748B;
    letter-spacing: 0.06em;
    margin-top: 2mm;
    text-align: center;
  }
  .footer {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7.5pt;
    color: #64748B;
    text-align: center;
    line-height: 1.4;
    border-top: 1px solid #E2E8F0;
    padding-top: 2mm;
    width: 100%;
  }
</style>
</head>
<body>
${mockBanner}
<div class="outer">
  <div class="inner">
    <span class="corner tl"></span>
    <span class="corner tr"></span>
    <span class="corner bl"></span>
    <span class="corner br"></span>

    <div class="header">
      <div class="bloodlink-name">
        <svg class="drop-svg" width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 0 C7 0 0 8.5 0 12 C0 15.866 3.134 18 7 18 C10.866 18 14 15.866 14 12 C14 8.5 7 0 7 0Z" fill="#C5162E"/>
        </svg>
        BloodLink
      </div>
      <div class="cert-title">Certificate of Appreciation</div>
      <div class="rule"></div>
    </div>

    <div class="body">
      <div class="presented-to">This certificate is presented to</div>
      <div class="donor-name">${name}</div>
      <div class="recognition">
        in grateful recognition of a voluntary whole blood donation,<br/>
        contributing to the well-being of patients in need.
      </div>
    </div>

    <div>
      <div class="details">
        <div class="detail-item">
          <div class="detail-label">Hospital / Centre</div>
          <div class="detail-value">${hospital}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Date of donation</div>
          <div class="detail-value">${date}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Donation type</div>
          <div class="detail-value">${type}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Volume</div>
          <div class="detail-value">${volume}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Blood group</div>
          <div class="detail-value">${bloodGroup}</div>
        </div>
      </div>
      <div class="ref-line">Reference: ${ref}</div>
    </div>

    <div class="footer">
      Issued by BloodLink from the donor&#39;s recorded donation.
      This is an appreciation certificate, not a medical document.
    </div>
  </div>
</div>
</body>
</html>`;
}

// --- Lab report HTML ---------------------------------------------------------

/** Builds a portrait A4 "Post-Donation Screening Summary" HTML document. */
export function buildLabReportHtml(data: LabReportData): string {
  const rawName = safeStr(data.donorName);
  const name = rawName === '-' ? 'Valued Donor' : escapeHtml(rawName);
  const date = escapeHtml(safeStr(data.donationDate));
  const reportedBy = escapeHtml(safeStr(data.reportedBy));
  const hemoglobin = escapeHtml(safeStr(data.hemoglobin));
  const volume = escapeHtml(safeNum(data.volumeMl, 'mL'));
  const diseases = escapeHtml(safeStr(data.infectiousDiseases));
  const doctorNote = escapeHtml(safeStr(data.doctorMessage));
  const statusLabel = data.allClear ? 'All clear' : 'Review required';
  const statusColor = data.allClear ? '#087B52' : '#D97706';

  const mockBanner = data.isMock
    ? `<div class="mock-banner">SAMPLE DATA - demo only</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #0F172A;
    line-height: 1.5;
  }
  .mock-banner {
    background: #FDE68A;
    color: #92400E;
    text-align: center;
    font-size: 10pt;
    font-weight: bold;
    padding: 5px 0;
    letter-spacing: 0.08em;
    margin-bottom: 8mm;
    border-radius: 3px;
  }
  .header {
    display: flex;
    align-items: center;
    border-bottom: 2px solid #C5162E;
    padding-bottom: 4mm;
    margin-bottom: 6mm;
  }
  .header-brand {
    display: flex;
    align-items: center;
    font-size: 11pt;
    font-weight: bold;
    color: #C5162E;
    letter-spacing: 0.1em;
    margin-right: 8mm;
  }
  .header-brand svg { margin-right: 5px; }
  .header-titles { flex: 1; }
  .report-title {
    font-size: 15pt;
    font-weight: bold;
    color: #0F172A;
    line-height: 1.1;
  }
  .report-sub {
    font-size: 8pt;
    color: #64748B;
    margin-top: 1mm;
  }
  .section { margin-bottom: 6mm; }
  .section-title {
    font-size: 9pt;
    font-weight: bold;
    color: #64748B;
    border-bottom: 1px solid #EEF0F6;
    padding-bottom: 1mm;
    margin-bottom: 3mm;
  }
  .info-grid { display: flex; flex-wrap: wrap; }
  .info-row { display: flex; flex-direction: column; width: 50%; margin-bottom: 2mm; }
  .info-label { font-size: 8pt; color: #64748B; }
  .info-value { font-size: 10pt; font-weight: 600; color: #0F172A; }
  .results-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .results-table th {
    text-align: left;
    font-size: 8pt;
    color: #64748B;
    padding: 1.5mm 2mm;
    border-bottom: 1px solid #EEF0F6;
    font-weight: 600;
  }
  .results-table td { padding: 2mm; border-bottom: 1px solid #EEF0F6; }
  .status-badge {
    display: inline-block;
    padding: 1mm 3mm;
    border-radius: 3px;
    font-size: 8.5pt;
    font-weight: bold;
    color: white;
    background: ${statusColor};
  }
  .doctor-note {
    background: #F8FAFC;
    border-left: 3px solid #C5162E;
    padding: 3mm 4mm;
    font-style: italic;
    color: #334155;
    font-size: 9.5pt;
    line-height: 1.6;
  }
  .footer {
    margin-top: 8mm;
    border-top: 1px solid #EEF0F6;
    padding-top: 3mm;
    font-size: 7.5pt;
    color: #64748B;
    line-height: 1.4;
  }
</style>
</head>
<body>
${mockBanner}

<div class="header">
  <div class="header-brand">
    <svg width="12" height="16" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 0 C7 0 0 8.5 0 12 C0 15.866 3.134 18 7 18 C10.866 18 14 15.866 14 12 C14 8.5 7 0 7 0Z" fill="#C5162E"/>
    </svg>
    BloodLink
  </div>
  <div class="header-titles">
    <div class="report-title">Post-Donation Screening Summary</div>
    <div class="report-sub">Confidential - for the donor only</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Donor information</div>
  <div class="info-grid">
    <div class="info-row">
      <span class="info-label">Donor name</span>
      <span class="info-value">${name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Donation date</span>
      <span class="info-value">${date}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Reported by</span>
      <span class="info-value">${reportedBy}</span>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Screening results</div>
  <table class="results-table">
    <thead>
      <tr><th>Marker</th><th>Result</th></tr>
    </thead>
    <tbody>
      <tr><td>Hemoglobin</td><td>${hemoglobin}</td></tr>
      <tr><td>Donation volume</td><td>${volume}</td></tr>
      <tr><td>HIV / HBV / HCV</td><td>${diseases}</td></tr>
      <tr><td>Overall status</td><td><span class="status-badge">${statusLabel}</span></td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Doctor&#39;s note</div>
  <div class="doctor-note">&ldquo;${doctorNote}&rdquo;</div>
</div>

<div class="footer">
  Screening markers are for transfusion safety, not a diagnosis.
  Final donor eligibility is decided by qualified blood-bank staff.
</div>
</body>
</html>`;
}
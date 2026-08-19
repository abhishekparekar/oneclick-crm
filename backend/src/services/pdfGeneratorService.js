const puppeteer = require("puppeteer");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (v) => {
  const n = Number(v) || 0;
  return "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDays = (v) => {
  const n = Number(v) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
};

/**
 * Generates an authentic, standard Indian corporate A4 HRMS payslip.
 */
const generatePayslipHTML = (payroll, company, settings = {}) => {
  const p = payroll.toObject ? payroll.toObject() : payroll;
  const snap = p.employeeSnapshot || {};
  const att = p.attendanceSummary || {};
  const earn = p.earnings || {};
  const ded = p.deductions || {};
  const monthName = MONTH_NAMES[(parseInt(p.month, 10) || 1) - 1] || p.month;
  const payslipId = `${settings.payslipPrefix || "PAY"}-${p.year}-${String(p.month).padStart(2, "0")}-${snap.employeeCode || ""}`;

  const earningRows = [
    ["Basic Salary", earn.basicSalary],
    ["House Rent Allowance (HRA)", earn.hra],
    ["Conveyance Allowance", earn.conveyanceAllowance],
    ["Medical Allowance", earn.medicalAllowance],
    ["Special Allowance", earn.specialAllowance],
    ["Other Allowance", earn.otherAllowance],
    ...(earn.bonus > 0 ? [["Bonus / Incentive", earn.bonus]] : []),
    ...(earn.incentive > 0 ? [["Performance Incentive", earn.incentive]] : []),
  ].filter(([, v]) => Number(v) > 0);

  const deductionRows = [
    ["Provident Fund (PF)", ded.pf],
    ["Employee State Insurance (ESI)", ded.esi],
    ["Professional Tax (PT)", ded.professionalTax],
    ["Tax Deducted at Source (TDS)", ded.tds],
    ["Other Deductions", ded.otherDeductions],
    ["Advance Recovery", ded.advanceDeduction],
  ].filter(([, v]) => Number(v) > 0);

  const grossEarnings = earn.grossEarnings || p.grossSalary || 0;
  const totalDeductions = ded.totalDeductions || 0;
  const netSalary = p.netSalary || 0;

  const maxRows = Math.max(earningRows.length, deductionRows.length, 5);

  const isPaid = p.status === "paid";
  const statusLabel = isPaid ? "PAID" : "PROCESSED";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payslip - ${snap.employeeName || "Employee"} (${monthName} ${p.year})</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    color: #0f172a;
    background: #f8fafc;
    padding: 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4;
    margin: 12mm 10mm;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .payslip-container { border: 1.5px solid #0f172a !important; box-shadow: none !important; }
  }

  .payslip-container {
    width: 100%;
    max-width: 740px;
    margin: 0 auto;
    background: #ffffff;
    border: 1.5px solid #1e293b;
    border-radius: 4px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  /* Header */
  .company-header {
    text-align: center;
    padding: 16px 20px 12px;
    border-bottom: 1.5px solid #1e293b;
    background: #ffffff;
  }
  .company-name {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #0f172a;
    text-transform: uppercase;
  }
  .company-address {
    font-size: 10px;
    color: #475569;
    margin-top: 2px;
  }
  .company-contact {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 1px;
  }
  .slip-heading {
    display: inline-block;
    margin-top: 8px;
    padding: 3px 18px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #0f172a;
    border: 1px solid #1e293b;
    background: #f1f5f9;
    border-radius: 3px;
  }

  /* Meta Strip */
  .meta-strip {
    display: flex;
    justify-content: space-between;
    padding: 6px 14px;
    background: #f8fafc;
    border-bottom: 1px solid #cbd5e1;
    font-size: 10px;
    font-weight: 600;
    color: #334155;
  }
  .meta-strip span b { color: #0f172a; }

  /* Standard Table */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
  }
  table.data-table th, table.data-table td {
    border: 1px solid #cbd5e1;
    padding: 5px 8px;
    font-size: 10px;
    line-height: 1.35;
  }
  table.data-table th {
    background: #f1f5f9;
    font-weight: 700;
    color: #1e293b;
    text-align: left;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.3px;
  }
  .label-cell {
    background: #f8fafc;
    font-weight: 600;
    color: #475569;
    width: 20%;
  }
  .value-cell {
    font-weight: 700;
    color: #0f172a;
    width: 30%;
  }

  /* Section Title Bar */
  .section-bar {
    background: #e2e8f0;
    font-weight: 800;
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 10px;
    color: #1e293b;
    border-top: 1px solid #cbd5e1;
    border-bottom: 1px solid #cbd5e1;
  }

  /* Attendance Matrix */
  .att-table td {
    text-align: center;
    font-size: 9.5px;
  }
  .att-table th {
    text-align: center;
    font-size: 8.5px;
  }
  .att-val {
    font-weight: 700;
    font-size: 11px;
    color: #0f172a;
  }
  .att-highlight {
    background: #f0fdf4 !important;
    color: #15803d !important;
    font-weight: 800 !important;
  }

  /* Ledger */
  .text-right { text-align: right !important; }
  .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .total-row td {
    background: #f1f5f9;
    font-weight: 800;
    font-size: 10.5px;
    color: #0f172a;
  }

  /* Net Salary Box */
  .net-box {
    border-top: 1.5px solid #1e293b;
    border-bottom: 1.5px solid #1e293b;
    background: #f8fafc;
    padding: 8px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .net-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #0f172a;
  }
  .net-words {
    font-size: 9.5px;
    color: #475569;
    font-style: italic;
    margin-top: 2px;
  }
  .net-amount {
    font-size: 16px;
    font-weight: 900;
    color: #0f172a;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  /* Signatures */
  .sign-area {
    display: flex;
    justify-content: space-between;
    padding: 36px 30px 12px;
  }
  .sign-box {
    text-align: center;
    width: 160px;
  }
  .sign-line {
    border-top: 1px dashed #475569;
    margin-bottom: 4px;
  }
  .sign-label {
    font-size: 9px;
    font-weight: 600;
    color: #475569;
  }

  /* Footer Note */
  .disclaimer {
    border-top: 1px solid #e2e8f0;
    padding: 6px 14px;
    font-size: 8px;
    color: #64748b;
    text-align: center;
    background: #f8fafc;
  }
</style>
</head>
<body>

<div class="payslip-container">
  
  <!-- Header -->
  <div class="company-header">
    <div class="company-name">${company?.name || "ONE CLICK SOLUTIONS"}</div>
    <div class="company-address">${company?.address || "Head Office, Corporate Business Park, India"}</div>
    <div class="company-contact">
      Email: ${company?.email || "admin@oneclick.com"} | Phone: ${company?.phone || "+91 98765 43210"}
    </div>
    <div>
      <span class="slip-heading">Payslip for ${monthName} ${p.year}</span>
    </div>
  </div>

  <!-- Meta Info -->
  <div class="meta-strip">
    <span>Payslip ID: <b>${payslipId}</b></span>
    <span>Pay Period: <b>${monthName} ${p.year}</b></span>
    <span>Status: <b>${statusLabel}</b></span>
  </div>

  <!-- Employee Info Table -->
  <div class="section-bar">1. Employee & Bank Information</div>
  <table class="data-table">
    <tr>
      <td class="label-cell">Employee Name</td>
      <td class="value-cell">${snap.employeeName || "–"}</td>
      <td class="label-cell">Employee Code</td>
      <td class="value-cell">${snap.employeeCode || "–"}</td>
    </tr>
    <tr>
      <td class="label-cell">Department</td>
      <td class="value-cell">${snap.department || "–"}</td>
      <td class="label-cell">Designation</td>
      <td class="value-cell">${snap.designation || "–"}</td>
    </tr>
    <tr>
      <td class="label-cell">Bank Name</td>
      <td class="value-cell">${snap.bankName || "–"}</td>
      <td class="label-cell">Bank Account No.</td>
      <td class="value-cell">${snap.accountNumber || "–"}</td>
    </tr>
    <tr>
      <td class="label-cell">IFSC Code</td>
      <td class="value-cell">${snap.ifscCode || "–"}</td>
      <td class="label-cell">PAN Number</td>
      <td class="value-cell">${snap.panNumber || "–"}</td>
    </tr>
  </table>

  <!-- Attendance Table -->
  <div class="section-bar">2. Attendance & Work Record</div>
  <table class="data-table att-table">
    <thead>
      <tr>
        <th>Total Days</th>
        <th>Working Days</th>
        <th>Weekly Offs</th>
        <th>Present</th>
        <th>Half Days</th>
        <th>Absent</th>
        <th>LOP Days</th>
        <th class="att-highlight">Payable Days</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="att-val">${fmtDays(att.totalCalendarDays || 30)}</td>
        <td class="att-val">${fmtDays(att.workingDays)}</td>
        <td class="att-val">${fmtDays(att.weeklyOffDays)}</td>
        <td class="att-val">${fmtDays((att.presentDays || 0) + (att.lateDays || 0))}</td>
        <td class="att-val">${fmtDays(att.halfDays)}</td>
        <td class="att-val">${fmtDays(att.absentDays)}</td>
        <td class="att-val" style="color: #dc2626;">${fmtDays(att.lossOfPayDays)}</td>
        <td class="att-val att-highlight">${fmtDays(att.payableDays)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Salary Breakdown Table -->
  <div class="section-bar">3. Salary & Deductions Statement</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 32%;">Earnings</th>
        <th style="width: 18%;" class="text-right">Amount (₹)</th>
        <th style="width: 32%;">Deductions</th>
        <th style="width: 18%;" class="text-right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from({ length: maxRows }).map((_, i) => {
        const e = earningRows[i];
        const d = deductionRows[i];
        return `<tr>
          <td>${e ? e[0] : ""}</td>
          <td class="text-right text-mono">${e ? fmt(e[1]) : ""}</td>
          <td>${d ? d[0] : ""}</td>
          <td class="text-right text-mono">${d ? fmt(d[1]) : ""}</td>
        </tr>`;
      }).join("")}
      <tr class="total-row">
        <td>Total Gross Earnings (A)</td>
        <td class="text-right text-mono">${fmt(grossEarnings)}</td>
        <td>Total Deductions (B)</td>
        <td class="text-right text-mono">${fmt(totalDeductions)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Net Salary Box -->
  <div class="net-box">
    <div>
      <div class="net-title">Net Take-Home Salary (A - B)</div>
      <div class="net-words">Amount in Words: <b>${p.amountInWords || "Rupees Only"}</b></div>
    </div>
    <div class="net-amount">${fmt(netSalary)}</div>
  </div>

  <!-- Signatures -->
  <div class="sign-area">
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-label">Employee Signature</div>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-label">Authorized Signatory / HR</div>
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="disclaimer">
    This document is an authenticated computer-generated payslip issued by ${company?.name || "One Click"} HRMS. Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.
  </div>

</div>

</body>
</html>`;
};

/**
 * Converts HTML string to PDF buffer using puppeteer.
 */
const generatePayslipPDF = async (html) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return pdf;
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { generatePayslipHTML, generatePayslipPDF };

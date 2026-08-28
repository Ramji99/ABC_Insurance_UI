/* ==========================================================================
   ABC HCP — Process Sheet loader
   The Process Sheet document's markup is inlined here as a template
   literal (kept in sync with shared/process-sheet.html, which still exists
   as the human-readable/editable source of truth for this content) rather
   than fetched at runtime — fetch() of a local file is blocked by the
   browser's file:// CORS policy, and this app is opened directly as a
   file:// document rather than through a local server, so a fetch-based
   loader wouldn't work. getProcessSheetHTML() just hands back the cached
   string synchronously; it stays async so existing `await` call sites
   don't need to change.
   ========================================================================== */

let cachedHtml = null;

function getProcessSheetHTML() {
  if (cachedHtml) return Promise.resolve(cachedHtml);
  cachedHtml = PROCESS_SHEET_HTML;
  return Promise.resolve(cachedHtml);
}

const PROCESS_SHEET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claims Process Sheet | ABC Health Claims Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Shared design tokens (colors, radius, shadows) -->
    <link rel="stylesheet" href="variables.css">
    <!-- This document's own layout/component styles -->
    <link rel="stylesheet" href="shared/process-sheet.css">
</head>
      <body>

          <!-- ABC Brand Header -->
          <div class="brand-header">
            <div class="brand-mark">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 4h16v6.5c0 6-4 9.5-8 11.5-4-2-8-5.5-8-11.5V4z" fill="#fff" fill-opacity=".92"/></svg>
            </div>
            <div class="brand-text">
              <b>ABC</b>
              <span>HEALTH CLAIMS PORTAL</span>
            </div>
            <div class="brand-header-right">
              <button class="print-btn" type="button" onclick="window.print()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                Print
              </button>
            </div>
          </div>

          <!-- Menu Bar -->
          <nav class="menu-bar">
              <a class="menu-item" href="#">📁 File</a>
              <a class="menu-item" href="#">📋 Edit</a>
              <a class="menu-item" href="#">🔍 Investigation Workspace</a>
              <a class="menu-item" href="#">💰 Billing & Payments</a>
              <a class="menu-item" href="#">✉️ Communications</a>
              <a class="menu-item" href="#">⚙️ System Logs</a>
          </nav>

          <!-- Main Workspace Layout -->
          <div class="workspace">

              <!-- Left Sidebar Navigation -->
              <aside class="sidebar">
                  <h3>Sections</h3>
                  <a href="#policy-overview" class="nav-item active">Policy &amp; Claim Overview</a>
                  <a href="#hospital-details" class="nav-item">Hospital & Location Details</a>
                  <a href="#travel-details" class="nav-item">Travel Details</a>
                  <a href="#timeline-processing" class="nav-item">Timeline & Processing</a>
                  <a href="#financial-tax" class="nav-item">Financial & Tax Details</a>
                  <a href="#investigation-status" class="nav-item">Investigation & Admin Status</a>
                  <a href="#remarks-allocations" class="nav-item">Remarks & Allocations</a>
                  <a href="#sum-insured" class="nav-item">Sum Insured Limits</a>
                  <a href="#courier-details" class="nav-item">Courier Details</a>
                  <a href="#bill-details" class="nav-item">Bill Details</a>
                  <a href="#bill-history" class="nav-item">Bill History</a>
                  <a href="#reminder-history" class="nav-item">Reminder History</a>
                  <a href="#movement-time" class="nav-item">Movement & Time</a>
                  <a href="#payment-details" class="nav-item">Payment Details</a>
                  <a href="#letter-details" class="nav-item">Letter Details</a>
                  <a href="#document-details" class="nav-item">Document Details</a>
                  <a href="#remarks-history" class="nav-item">Remarks History</a>
              </aside>

              <!-- Dynamic Content Panel -->
              <main class="content-area">

                  <header class="dashboard-header">
                      <div>
                        <h1>Claims Process Sheet</h1>
                        <div class="ds-sub">Full read-only summary compiled across every stage of claim processing</div>
                      </div>
                  </header>

                  <!-- 1. Policy & Claim Overview -->
                  <section id="policy-overview" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Policy & Claim Overview</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">Policy Type:</span><span class="field-value">RETAIL</span></div>
                          <div class="data-field"><span class="field-label">Policy Source:</span><span class="field-value">GENISYS</span></div>
                          <div class="data-field"><span class="field-label">Claim No:</span><span class="field-value"><a href="#">RR-HS26-15703133</a></span></div>

                          <div class="data-field"><span class="field-label">Claim Type:</span><span class="field-value">Reimbursment</span></div>
                          <div class="data-field"><span class="field-label">Limitless Opted:</span><span class="field-value">NO</span></div>
                          <div class="data-field"><span class="field-label">Product Name:</span><span class="field-value">Energy Individual Policy</span></div>

                          <div class="data-field"><span class="field-label">Policy No:</span><span class="field-value">2814204791408003</span></div>
                          <div class="data-field"><span class="field-label">NRI Discount Recovered:</span><span class="field-value">NA</span></div>
                          <div class="data-field"><span class="field-label">Product Code:</span><span class="field-value">2814</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 2. Hospital & Location Details -->
                  <section id="hospital-details" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Hospital & Location Details</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">Hospital Name:</span><span class="field-value">CHRISTIAN MEDICAL COLLEGE & HOSPITAL</span></div>
                          <div class="data-field"><span class="field-label">ABHA ID:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Patient Relationship:</span><span class="field-value">Self</span></div>

                          <div class="data-field"><span class="field-label">City:</span><span class="field-value">LUDHIANA</span></div>
                          <div class="data-field"><span class="field-label">ABHA Address:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">DOA (Date of Admission):</span><span class="field-value">20/05/2026 00:01</span></div>

                          <div class="data-field"><span class="field-label">State:</span><span class="field-value">PUNJAB</span></div>
                          <div class="data-field"><span class="field-label">Patient Name:</span><span class="field-value">ANURADHA</span></div>
                          <div class="data-field"><span class="field-label">DOD (Date of Discharge):</span><span class="field-value">20/05/2026 23:59</span></div>

                          <div class="data-field"><span class="field-label">Hospital Status:</span><span class="field-value">Approved by NSP</span></div>
                          <div class="data-field"><span class="field-label">Patient Gender:</span><span class="field-value">Female</span></div>
                          <div class="data-field"><span class="field-label">Reimbursement Type:</span><span class="field-value">Claim Without Intimation</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 3. Travel Details -->
                  <section id="travel-details" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Travel Details</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">Date of Departure:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Proposer Name:</span><span class="field-value">ANURADHA .</span></div>
                          <div class="data-field"><span class="field-label">Nature of Disability:</span><span class="field-value">Hospitalization</span></div>

                          <div class="data-field"><span class="field-label">Date of Arrival:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">HEGIC Card No:</span><span class="field-value">ER2221131412-01E</span></div>
                          <div class="data-field"><span class="field-label">Corporate ID:</span><span class="field-value">NA</span></div>

                          <div class="data-field"><span class="field-label">Flight No:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Policy Period:</span><span class="field-value">16/08/2025 - 15/08/2026</span></div>
                          <div class="data-field"><span class="field-label">Corporate Name:</span><span class="field-value">NA</span></div>

                          <div class="data-field"><span class="field-label">No of travel days in current trip:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Batch ID:</span><span class="field-value">NA</span></div>
                          <div class="data-field"><span class="field-label">Employee ID:</span><span class="field-value">NA</span></div>

                          <div class="data-field"><span class="field-label">Total No of Travel Days for all trips:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Employee Grade:</span><span class="field-value">Silver</span></div>
                          <div class="data-field"></div>

                          <div class="data-field"><span class="field-label">Flight Name:</span><span class="field-value value-blank">-</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 4. Timeline & Processing -->
                  <section id="timeline-processing" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Timeline & Processing</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">Claim Intimation Date:</span><span class="field-value">30/05/2026</span></div>
                          <div class="data-field"><span class="field-label">Ailment Name:</span><span class="field-value">Atherosclerotic heart disease of native coronary artery without angina pectoris</span></div>
                          <div class="data-field"><span class="field-label">Claimed Amount:</span><span class="field-value">125081</span></div>

                          <div class="data-field"><span class="field-label">First Doc Received Date:</span><span class="field-value">30/05/2026</span></div>
                          <div class="data-field"><span class="field-label">ICD Code:</span><span class="field-value">I25.10</span></div>
                          <div class="data-field"><span class="field-label">Deductible Amount:</span><span class="field-value">0</span></div>

                          <div class="data-field"><span class="field-label">Last Doc Received:</span><span class="field-value">08/07/2026</span></div>
                          <div class="data-field"><span class="field-label">Ailment as per discharge card:</span><span class="field-value">CAD</span></div>
                          <div class="data-field"><span class="field-label">Co-Payment:</span><span class="field-value">0</span></div>

                          <div class="data-field"><span class="field-label">Policy Cont. For Period:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">PreAuth CoPay Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Zonal Co-Payment:</span><span class="field-value">0</span></div>

                          <div class="data-field"><span class="field-label">DOJ (For Corporate Customer):</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">PreAuth Zonal CoPay Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Policy Deduction Amount:</span><span class="field-value">0</span></div>

                          <div class="data-field"><span class="field-label">Reopen Date:</span><span class="field-value">-</span></div>
                          <div class="data-field"></div>
                          <div class="data-field"><span class="field-label">TDS Amount:</span><span class="field-value">0</span></div>

                          <div class="data-field"><span class="field-label">Total Authorized Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"></div>
                          <div class="data-field"><span class="field-label">Net Payable:</span><span class="field-value">108680</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 5. Financial & Tax Details -->
                  <section id="financial-tax" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Financial & Tax Details</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">Policy Deduction Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">GST Deduction Remarks:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Investigation Status:</span><span class="field-value">CIMA CLOSED - HCS</span></div>

                          <div class="data-field"><span class="field-label">TDS Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Early Payment Discount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Investigation Source:</span><span class="field-value">ARYA</span></div>

                          <div class="data-field"><span class="field-label">Net Payable Amount (Excluding GST):</span><span class="field-value">108680</span></div>
                          <div class="data-field"><span class="field-label">Claim Approximate Amount:</span><span class="field-value">125081</span></div>
                          <div class="data-field"><span class="field-label">Investigation Type:</span><span class="field-value">Auto</span></div>

                          <div class="data-field"><span class="field-label">Net Payable Amount (Including GST):</span><span class="field-value">108680</span></div>
                          <div class="data-field"><span class="field-label">TAT (In Days):</span><span class="field-value">2</span></div>
                          <div class="data-field"><span class="field-label">Investigation initiated Date & Time:</span><span class="field-value">30/05/2026 04:04:04 PM</span></div>

                          <div class="data-field"><span class="field-label">Is GST Applicable on Room Rent?:</span><span class="field-value">No</span></div>
                          <div class="data-field"><span class="field-label">Claim Generated By:</span><span class="field-value">Tarun Kumar Singh</span></div>
                          <div class="data-field"><span class="field-label">CIMA Closed Date & Time:</span><span class="field-value">17/06/2026 12:08:52 PM</span></div>

                          <div class="data-field"><span class="field-label">Hospital GSTIN No.:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Missing Middle:</span><span class="field-value">No</span></div>
                          <div class="data-field"><span class="field-label">HCS Investigation Status:</span><span class="field-value">CLOSED</span></div>

                          <div class="data-field"><span class="field-label">From State:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">External Status:</span><span class="field-value">New Request</span></div>
                          <div class="data-field"><span class="field-label">Investigation Approval / Rejected Date & Time:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">Dummy GSTIN No.:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Internal Status:</span><span class="field-value">Reimbursement - Settlement - Done - NM</span></div>
                          <div class="data-field"><span class="field-label">CIMA Send Date & Time:</span><span class="field-value">30/05/2026 04:04:04 PM</span></div>

                          <div class="data-field"><span class="field-label">To State:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Final Status:</span><span class="field-value">Under Process</span></div>

                          <!-- Interactive Action Links Column Stack -->
                          <div class="data-field action-link-group">
                              <span class="field-label" style="display:block; margin-bottom:5px;">Links / Actions Available</span>
                              <a href="#">🔗 View Sherlock Details</a>
                              <a href="#">🔗 View Munich Details</a>
                              <a href="#">🔗 View Arya Details</a>
                              <a href="#">🔗 View CIMA Details</a>
                              <a href="#">🔗 View CIMA Documents</a>
                              <a href="#">🔗 View insight of claim</a>
                              <a href="#">🔗 View Communication Entity Detail</a>
                          </div>

                          <div class="data-field"><span class="field-label">Room Rent IGST Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field medico-opinion-block">
                              <span class="field-label">Medico Opinion:</span>
                              <span class="field-value">1. Treating doctor's certificate for exact duration of the Hypertension in DD/MM/YYYY format along with past consultation papers and treatment records.</span>
                          </div>

                          <div class="data-field"><span class="field-label">Room Rent CGST Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Last Transaction Date:</span><span class="field-value value-blank">-</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">Room Rent SGST Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">No. of POS:</span><span class="field-value value-blank">-</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">GST applicable Room Rent amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Denial Clause:</span><span class="field-value value-blank">-</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">GST Invoice Date:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Reason for Reopen / Invalid:</span><span class="field-value value-blank">-</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">Over and Above SI:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Is Claim Reconsideration:</span><span class="field-value">NO</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">GST Claimed By Hospital:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Is Withdraw:</span><span class="field-value">NO</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">Final Payable GST:</span><span class="field-value">0</span></div>
                          <div class="data-field"></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">GST Deductions:</span><span class="field-value">0</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 6. Investigation & Administrative Status -->
                  <section id="investigation-status" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Investigation & Administrative Status</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">HCS Investigation Status:</span><span class="field-value">CLOSED</span></div>
                          <div class="data-field"><span class="field-label">Investigation Reason:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Card Block Date:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">Investigation Approval / Rejected Date & Time:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Investigation App:</span><span class="field-value">CHASE</span></div>
                          <div class="data-field"><span class="field-label">Loss Type:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">CIMA Send Date & Time:</span><span class="field-value">30/05/2026 04:04:04 PM</span></div>
                          <div class="data-field"><span class="field-label">Card Type:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Card Holder Name:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">CIMA Grading:</span><span class="field-value">3</span></div>
                          <div class="data-field"><span class="field-label">Intimation TAT(In Days):</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Insured Name:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">RLMU Updated Grade:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">DOL:</span><span class="field-value">20/05/2026</span></div>
                          <div class="data-field"><span class="field-label">Plan Name:</span><span class="field-value" style="color:#b21f1f; font-weight:bold;">Silver</span></div>

                          <div class="data-field"><span class="field-label">Date & Time of grade update:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Loss Amount:</span><span class="field-value">125081</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">Investigation Assign by:</span><span class="field-value">Auto Assign</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 7. Remarks & Financial Allocations -->
                  <section id="remarks-allocations" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Remarks & Financial Allocations</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">NSP Remark:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Compensation/Other charges:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Penny Drop Verified:</span><span class="field-value" style="color:green; font-weight:bold;">Yes</span></div>

                          <div class="data-field"><span class="field-label">Confirm by NSP:</span><span class="field-value">No</span></div>
                          <div class="data-field"><span class="field-label">Interest(TDS):</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Grievance Tagged:</span><span class="field-value">No</span></div>

                          <div class="data-field"><span class="field-label">Claim Intimation Source:</span><span class="field-value">CLAIM</span></div>
                          <div class="data-field"><span class="field-label">Penalty:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Epharmacy:</span><span class="field-value">No</span></div>

                          <div class="data-field"><span class="field-label">Interest Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Customer Segment:</span><span class="field-value">NA</span></div>
                          <div class="data-field"><span class="field-label">Partner Reference Id:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">Interest TDS Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Loyalty Number:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Consent Status:</span><span class="field-value">No</span></div>

                          <div class="data-field"><span class="field-label">Reserved Amount:</span><span class="field-value">69500</span></div>
                          <div class="data-field"><span class="field-label">CKYC No:</span><span class="field-value value-blank">-</span></div>
                          <div></div>

                          <div class="data-field"><span class="field-label">Complain Type:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Conversion Rate:</span><span class="field-value">1</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 8. Sum Insured Limits -->
                  <section id="sum-insured" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Sum Insured Limits</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">Sum Insured:</span><span class="field-value">300000</span></div>
                          <div class="data-field"><span class="field-label">Cumulative Bonus:</span><span class="field-value">90000</span></div>
                          <div class="data-field"><span class="field-label">Protector Rider:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Total Sum Insured:</span><span class="field-value" style="font-weight: bold;">390000</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 9. Courier Details -->
                  <section id="courier-details" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Courier Details</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">POD Number:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Courier Receipt Date:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Courier Company Name:</span><span class="field-value value-blank">-</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 10. GRID: Bill Details -->
                  <section id="bill-details" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">📋 Bill Details</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="table-responsive">
                          <table>
                              <thead>
                                  <tr>
                                      <th>Bill No.</th>
                                      <th>Bill Date</th>
                                      <th>Bill Category</th>
                                      <th>Claimed Amt</th>
                                      <th>Discount</th>
                                      <th>Tariff Deduct.</th>
                                      <th>Deduction</th>
                                      <th>Deduction Remark</th>
                                      <th>Payable Amt</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr><td>1270</td><td>20/05/2026</td><td>Investigation Charges</td><td>2290</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>2290</td></tr>
                                  <tr><td>3885</td><td>20/05/2026</td><td>pharmacyBillHead</td><td>8896</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>8896</td></tr>
                                  <tr><td>8987</td><td>20/05/2026</td><td>pharmacyBillHead</td><td>91</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>91</td></tr>
                                  <tr style="background-color: #fff5f5;"><td>NA</td><td>20/05/2026</td><td>Other Expenses</td><td>16401</td><td>0</td><td>0</td><td style="color:#c92a2a; font-weight:500;">16401</td><td style="color:#c92a2a;">Medicine bills not clear</td><td style="font-weight:bold;">0</td></tr>
                                  <tr><td>0861</td><td>20/05/2026</td><td>Professional Fees Charges</td><td>600</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>600</td></tr>
                                  <tr><td>8995</td><td>20/05/2026</td><td>pharmacyBillHead</td><td>6.50</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>6.50</td></tr>
                                  <tr><td>1270</td><td>20/05/2026</td><td>ICU Charges</td><td>4630</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>4630</td></tr>
                                  <tr><td>0864</td><td>20/05/2026</td><td>Investigation Charges</td><td>14110</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>14110</td></tr>
                                  <tr><td>0863</td><td>20/05/2026</td><td>Ambulance Charges</td><td>1500</td><td>0</td><td>0</td><td>0</td><td class="value-blank">-</td><td>1500</td></tr>
                              </tbody>
                          </table>
                      </div>
                      <div class="data-grid-3col" style="border-top: 1px solid var(--border-color); background-color: #fafafa;">
                          <div class="data-field"><span class="field-label">Reason for Cancellation / Re Issue:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">IFSC Code:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Payment TAT(In Days):</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Total EMI Recovery Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Payment History:</span><span class="field-value"><a href="#">🔗 View Payment History</a></span></div>
                          <div class="data-field"><span class="field-label">Cheque Dispatch Date:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Payment Mode:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Payment Status:</span><span class="field-value value-blank">-</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 11. GRID: Bill History -->
                  <section id="bill-history" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">📋 Bill History Summary</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="table-responsive">
                          <table>
                              <thead>
                                  <tr>
                                      <th>Claim Number</th>
                                      <th>Claimed Amount</th>
                                      <th>Deduction</th>
                                      <th>Discount</th>
                                      <th>Payable Amount</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr style="font-weight: bold;">
                                      <td>Total</td>
                                      <td>0</td>
                                      <td>0</td>
                                      <td>0</td>
                                      <td>0</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
                  </section>

                  <!-- 12. GRID: Reminder History -->
                  <section id="reminder-history" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">📋 Reminder History</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="table-responsive">
                          <table>
                              <thead>
                                  <tr>
                                      <th>Reminder Type</th>
                                      <th>Reminder Date</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr><td>Second Reminder Letter</td><td>02/07/2026</td></tr>
                                  <tr><td>Third Reminder Letter</td><td>05/07/2026</td></tr>
                                  <tr><td>Fourth Reminder Letter</td><td>08/07/2026</td></tr>
                                  <tr><td>First Reminder Letter</td><td>10/06/2026</td></tr>
                                  <tr><td>First Reminder Letter</td><td>29/06/2026</td></tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
                  </section>

                  <!-- 13. GRID: Movement and Time -->
                  <section id="movement-time" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">📋 Movement & Time Workflow Audit</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="table-responsive">
                          <table>
                              <thead>
                                  <tr>
                                      <th>Role</th>
                                      <th>First Assigned Date</th>
                                      <th>User Name</th>
                                      <th>Timestamp</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr><td>Non Medico TL</td><td>30/05/2026 05:21:11</td><td>sant Lal Baloni</td><td>30/05/2026 05:21:11 PM</td></tr>
                                  <tr><td>Medico</td><td>03/06/2026 12:23:05</td><td>Bollu Mamtha</td><td>19/06/2026 06:06:09 PM</td></tr>
                                  <tr><td>Auditor TL</td><td>03/06/2026 09:02:26</td><td>Abhinav singh HEHI</td><td>19/06/2026 10:41:53 PM</td></tr>
                                  <tr><td>Auditor</td><td>03/06/2026 09:02:26</td><td>Priyatosh Kaushik</td><td>22/06/2026 08:34:48 AM</td></tr>
                                  <tr><td>SYSTEM</td><td>30/05/2026 05:21:11</td><td>System User</td><td>08/07/2026 06:28:28 PM</td></tr>
                                  <tr><td>Non Medico</td><td>30/05/2026 05:21:11</td><td>Saket chandra jha</td><td>08/07/2026 06:28:28 PM</td></tr>
                                  <tr><td>Medico TL</td><td>03/06/2026 12:23:05</td><td>Dr. Neelima Joshi HEHI</td><td>08/07/2026 08:43:43 PM</td></tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
                  </section>

                  <!-- 14. Payment Details -->
                  <section id="payment-details" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">Payment Details</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="data-grid-3col">
                          <div class="data-field"><span class="field-label">Payee Type:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Bank A/C No. (Account No of the Payee):</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Cheque Date:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">Cheque In Fav Of:</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Bank Name (Insured):</span><span class="field-value value-blank">-</span></div>
                          <div class="data-field"><span class="field-label">Cheque Credit Date:</span><span class="field-value value-blank">-</span></div>

                          <div class="data-field"><span class="field-label">Cheque Amount:</span><span class="field-value">0</span></div>
                          <div class="data-field"><span class="field-label">Cheque/NEFT Number:</span><span class="field-value value-blank">-</span></div>
                      </div>
                  </div>
                  </section>

                  <!-- 15. GRID: Letter Details -->
                  <section id="letter-details" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">📋 Outbound Letter Documents Log</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="table-responsive">
                          <table>
                              <thead>
                                  <tr>
                                      <th>Claim Number</th>
                                      <th>Document Type</th>
                                      <th>Created By</th>
                                      <th>Created Date</th>
                                      <th>Actions</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">First Query Letter</a></td><td>N Gopi</td><td>03/06/2026 22:43:05</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">First Reminder Letter</a></td><td>SYSTEM</td><td>10/06/2026 00:41:11</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">First Query Letter</a></td><td>HCSQC Bot1</td><td>12/06/2026 12:54:46</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">First Query Letter</a></td><td>Priyatosh Kaushik</td><td>22/06/2026 13:21:02</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">First Reminder Letter</a></td><td>SYSTEM</td><td>29/06/2026 00:16:16</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">Second Reminder Letter</a></td><td>SYSTEM</td><td>02/07/2026 00:21:37</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">Third Reminder Letter</a></td><td>SYSTEM</td><td>05/07/2026 00:18:17</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                                  <tr><td>RR-HS26-15703133</td><td><a href="#">Fourth Reminder Letter</a></td><td>SYSTEM</td><td>08/07/2026 00:13:42</td><td><a href="#">View</a> | <a href="#">Download</a> | <a href="#" class="btn-action">Resend</a></td></tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
                  </section>

                  <!-- 16. GRID: Document Details -->
                  <section id="document-details" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">📋 Scanned Document Attachments</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="table-responsive">
                          <table>
                              <thead>
                                  <tr>
                                      <th>File Name</th>
                                      <th>Document Type</th>
                                      <th>Created By</th>
                                      <th>Created Date</th>
                                      <th>Actions</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr><td><a href="#">5.pdf</a></td><td>Bills</td><td>ScanDocScheduler</td><td>30/05/2026 16:13:14</td><td><a href="#">View</a> | <a href="#">Download</a></td></tr>
                                  <tr><td><a href="#">Photo_202_compressed.pdf</a></td><td>Others</td><td>ScanDocScheduler</td><td>30/05/2026 16:13:14</td><td><a href="#">View</a> | <a href="#">Download</a></td></tr>
                                  <tr><td><a href="#">Photo_203_compressed.pdf</a></td><td>Others</td><td>ScanDocScheduler</td><td>30/05/2026 16:13:14</td><td><a href="#">View</a> | <a href="#">Download</a></td></tr>
                                  <tr><td><a href="#">Photo_205_compressed.pdf *</a></td><td>Others *</td><td>ScanDocScheduler</td><td>30/05/2026 16:13:14</td><td><a href="#">View</a> | <a href="#">Download</a></td></tr>
                                  <tr><td><a href="#">11.pdf</a></td><td>Query Reply</td><td>ScanDocScheduler</td><td>11/06/2026 14:23:37</td><td><a href="#">View</a> | <a href="#">Download</a></td></tr>
                                  <tr><td><a href="#">11.pdf *</a></td><td>Query Reply *</td><td>ScanDocScheduler</td><td>15/06/2026 11:58:18</td><td><a href="#">View</a> | <a href="#">Download</a></td></tr>
                                  <tr><td><a href="#">11.pdf</a></td><td>Query Reply</td><td>ScanDocScheduler</td><td>08/07/2026 17:48:31</td><td><a href="#">View</a> | <a href="#">Download</a></td></tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
                  </section>

                  <!-- 17. GRID: Remarks History -->
                  <section id="remarks-history" class="section-card">
                      <div class="section-title" onclick="toggleAccordion(this)"><span class="section-title-text">📋 Full Medical & Processing Remarks Log</span><span class="toggle-icon">&#9662;</span></div>
                      <div class="accordion-body">
                      <div class="remarks-trail">
                          <div class="remark-entry">
                              <div class="remark-meta">
                                  <span class="remark-role">Medico</span>
                                  <span class="remark-user">Rohit Kumar Badodiya</span>
                                  <span class="remark-time">17/06/2026 10:16:50 AM</span>
                              </div>
                              <textarea class="remark-text" readonly>CIMA open</textarea>
                          </div>
                          <div class="remark-entry">
                              <div class="remark-meta">
                                  <span class="remark-role">Non Medico</span>
                                  <span class="remark-user">System User</span>
                                  <span class="remark-time">17/06/2026 12:18:58 PM</span>
                              </div>
                              <textarea class="remark-text" readonly style="font-weight: 500; color: #1c7ed6;">CIMA CLOSURE</textarea>
                          </div>
                          <div class="remark-entry">
                              <div class="remark-meta">
                                  <span class="remark-role">Medico</span>
                                  <span class="remark-user">Bollu Mamtha</span>
                                  <span class="remark-time">19/06/2026 06:06:09 PM</span>
                              </div>
                              <textarea class="remark-text" readonly>2022-07-20</textarea>
                          </div>
                          <div class="remark-entry">
                              <div class="remark-meta">
                                  <span class="remark-role">Auditor TL</span>
                                  <span class="remark-user">HCSQC Bot1</span>
                                  <span class="remark-time">19/06/2026 10:41:54 PM</span>
                              </div>
                              <textarea class="remark-text" readonly>Move to TL</textarea>
                          </div>
                          <div class="remark-entry">
                              <div class="remark-meta">
                                  <span class="remark-role">Auditor</span>
                                  <span class="remark-user">Priyatosh Kaushik</span>
                                  <span class="remark-time">22/06/2026 01:20:58 PM</span>
                              </div>
                              <textarea class="remark-text" readonly>W Qc</textarea>
                          </div>
                      </div>
                  </div>
                  </section>

              </main>
          </div>

          <script>
              const sections = document.querySelectorAll('.section-card');
              const navItems = document.querySelectorAll('.nav-item');
              const contentArea = document.querySelector('.content-area');

              // Collapse / expand an individual accordion section
              function toggleAccordion(titleEl) {
                  titleEl.parentElement.classList.toggle('collapsed');
              }

              // Click-to-navigate: scroll the content area (not the window) to the chosen section
              navItems.forEach(item => {
                  item.addEventListener('click', (e) => {
                      e.preventDefault();
                      const targetId = item.getAttribute('href').substring(1);
                      const targetSection = document.getElementById(targetId);
                      if (!targetSection) return;

                      // Expand the section if it was collapsed so the user can see it
                      targetSection.classList.remove('collapsed');

                      const targetTop = targetSection.offsetTop - contentArea.offsetTop - 15;
                      contentArea.scrollTo({ top: targetTop, behavior: 'smooth' });

                      navItems.forEach(nav => nav.classList.remove('active'));
                      item.classList.add('active');
                  });
              });

              // Keep the sidebar in sync with manual scrolling
              contentArea.addEventListener('scroll', () => {
                  let current = '';
                  sections.forEach(section => {
                      const sectionTop = section.offsetTop - contentArea.offsetTop;
                      if (contentArea.scrollTop >= sectionTop - 60) {
                          current = section.getAttribute('id');
                      }
                  });

                  navItems.forEach(item => {
                      item.classList.remove('active');
                      if (item.getAttribute('href') === '#' + current) {
                          item.classList.add('active');
                      }
                  });
              });
          </script>
      </body>
</html>
`;

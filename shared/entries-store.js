/* ==========================================================================
   ABC HCP — Shared Entries Data Store
   Extracted from app.js (shared data/router layer, precursor to splitting
   process-claim.html out of index.html) — no behaviour change.

   `entries` is exported as a single shared array reference. Every view
   (Inward Entry, Claim Intimation, Medico wizard, Payment, ...) that reads
   or mutates claim records must import THIS array — never construct its
   own copy — so that edits made in one view are visible in another.
   ========================================================================== */

function iso(y, m, d, h = 9, mi = 0) { return new Date(y, m - 1, d, h, mi).toISOString(); }

const EXISTING_BARCODES = new Set(["PKG-0000451", "PKG-0000388", "PKG-0000299"]);

const entries = [
  { inwardId: "INW/20260609/00071", barcode: "PKG-0000451", totalSheets: 18, docCondition: "Good", source: "Courier", receivedDate: "2026-06-08", referenceId: "REF-77410", policyId: "HE/HGP/21020101/00/000451", surakshaId: "", patientName: "Ramesh Iyer", proposerName: "Lakshmi Iyer", contactNumber: "9845012233", hospitalName: "Apollo Hospitals - Jubilee Hills", createdDate: iso(2026, 6, 9, 9, 10), updatedDate: iso(2026, 6, 9, 9, 10), status: "Active", assignedUser: "Priya Sharma", claimStatus: "Completed", claimId: "CLM-20260609-0071", priority: "High", claimType: "Health", claimAmount: 185000, medicoStatus: "Approved", emailStatus: "Opened", claimSubType: "Reimbursement" },
  { inwardId: "INW/20260620/00098", barcode: "PKG-0000388", totalSheets: 9, docCondition: "Damaged", source: "Post", receivedDate: "2026-06-19", referenceId: "REF-77522", policyId: "HE/HGP/21020101/00/000388", surakshaId: "", patientName: "Farida Sheikh", proposerName: "Imran Sheikh", contactNumber: "9900112244", hospitalName: "Yashoda Hospitals - Somajiguda", createdDate: iso(2026, 6, 20, 11, 5), updatedDate: iso(2026, 6, 21, 15, 40), status: "Inactive", assignedUser: null, claimStatus: "Not Started", claimId: "CLM-20260620-0098", priority: "Medium", claimType: "Accident", claimAmount: 42000, medicoStatus: "In Progress", emailStatus: "Error", claimSubType: "Cashless" },
  { inwardId: "INW/20260625/00112", barcode: "PKG-0000299", totalSheets: 22, docCondition: "Good", source: "Courier", receivedDate: "2026-06-25", referenceId: "", policyId: "", surakshaId: "SRK-2026-004299", patientName: "Vikram Nair", proposerName: "Vikram Nair", contactNumber: "9811223344", hospitalName: "Care Hospitals - Banjara Hills", createdDate: iso(2026, 6, 25, 10, 20), updatedDate: iso(2026, 6, 25, 10, 20), status: "Pending - Claim Intimation", assignedUser: "Arjun Mehta", claimStatus: "In Progress", claimId: "CLM-20260625-0112", priority: "High", claimType: "Critical Illness", claimAmount: 620000, medicoStatus: "In Progress", emailStatus: "Under Process", claimSubType: "Reimbursement", isPriorityClaim: true, priorityReason: "High Paying Customer" },
  { inwardId: "INW/20260628/00120", barcode: "PKG-0000512", totalSheets: 14, docCondition: "Good", source: "Hand Delivery", receivedDate: "2026-06-27", referenceId: "REF-77890", policyId: "HE/HGP/21020101/00/000512", surakshaId: "", patientName: "Anitha Rao", proposerName: "Suresh Rao", contactNumber: "9876501122", hospitalName: "KIMS Hospitals - Kondapur", createdDate: iso(2026, 6, 28, 9, 45), updatedDate: iso(2026, 6, 28, 9, 45), status: "Active", assignedUser: null, claimStatus: "Completed", claimId: "CLM-20260628-0120", priority: "Low", claimType: "Health", claimAmount: 28500, medicoStatus: "Approved", emailStatus: "Closed", claimSubType: "Reimbursement" },
  { inwardId: "INW/20260701/00131", barcode: "PKG-0000544", totalSheets: 6, docCondition: "Partial", source: "Call Centre", receivedDate: "2026-06-30", referenceId: "", policyId: "HE/HGP/21020101/00/000544", surakshaId: "", patientName: "Deepak Verma", proposerName: "", contactNumber: "9765043210", hospitalName: "Apollo Hospitals - Jubilee Hills", createdDate: iso(2026, 7, 1, 14, 15), updatedDate: iso(2026, 7, 1, 14, 15), status: "Pending - Claim Intimation", assignedUser: "Fatima Ali", claimStatus: "Not Started", claimId: "CLM-20260701-0131", priority: "Medium", claimType: "Health", claimAmount: 76000, medicoStatus: "In Progress", emailStatus: "Pending", claimSubType: "Cashless" },
  { inwardId: "INW/20260702/00135", barcode: "PKG-0000560", totalSheets: 11, docCondition: "Good", source: "Courier", receivedDate: "2026-07-02", referenceId: "REF-78001", policyId: "", surakshaId: "SRK-2026-004560", patientName: "Neha Kapoor", proposerName: "Ravi Kapoor", contactNumber: "9988776655", hospitalName: "Yashoda Hospitals - Somajiguda", createdDate: iso(2026, 7, 2, 10, 0), updatedDate: iso(2026, 7, 3, 9, 10), status: "Active", assignedUser: null, claimStatus: "In Progress", claimId: "CLM-20260702-0135", priority: "High", claimType: "Death", claimAmount: 950000, medicoStatus: "In Progress", emailStatus: "Opened", claimSubType: "Reimbursement" },
  { inwardId: "INW/20260703/00140", barcode: "PKG-0000571", totalSheets: 19, docCondition: "Good", source: "Post", receivedDate: "2026-07-03", referenceId: "", policyId: "HE/HGP/21020101/00/000571", surakshaId: "", patientName: "Suresh Pillai", proposerName: "Suresh Pillai", contactNumber: "9012345678", hospitalName: "Care Hospitals - Banjara Hills", createdDate: iso(2026, 7, 3, 16, 30), updatedDate: iso(2026, 7, 3, 16, 30), status: "Active", assignedUser: "Rohit Verma", claimStatus: "Completed", claimId: "CLM-20260703-0140", priority: "Low", claimType: "Accident", claimAmount: 31000, medicoStatus: "Approved", emailStatus: "Closed", claimSubType: "Cashless" },
  { inwardId: "INW/20260705/00151", barcode: "PKG-0000588", totalSheets: 8, docCondition: "Illegible", source: "Hand Delivery", receivedDate: "2026-07-04", referenceId: "REF-78145", policyId: "", surakshaId: "SRK-2026-004588", patientName: "Priya Menon", proposerName: "", contactNumber: "9123456780", hospitalName: "KIMS Hospitals - Kondapur", createdDate: iso(2026, 7, 5, 8, 55), updatedDate: iso(2026, 7, 5, 8, 55), status: "Inactive", assignedUser: null, claimStatus: "Not Started", claimId: "CLM-20260705-0151", priority: "Medium", claimType: "Health", claimAmount: 54000, medicoStatus: "Rejected", emailStatus: "Error", claimSubType: "Reimbursement" },
  { inwardId: "INW/20260706/00159", barcode: "PKG-0000602", totalSheets: 15, docCondition: "Good", source: "Hand Delivery", receivedDate: "2026-07-06", referenceId: "", policyId: "HE/HGP/21020101/00/000602", surakshaId: "", patientName: "Arjun Reddy", proposerName: "Kavya Reddy", contactNumber: "9234567891", hospitalName: "Apollo Hospitals - Jubilee Hills", createdDate: iso(2026, 7, 6, 12, 0), updatedDate: iso(2026, 7, 6, 12, 0), status: "Pending - Claim Intimation", assignedUser: "Sneha Kapoor", claimStatus: "In Progress", claimId: "CLM-20260706-0159", priority: "High", claimType: "Critical Illness", claimAmount: 410000, medicoStatus: "In Progress", emailStatus: "Under Process", payments: [{ neftCode: "NEFT-60602", paymentMode: "NEFT", payeeName: "Kavya Reddy", accountNo: "60602001998877", accountType: "Savings", bankName: "ABC Bank", branchName: "Jubilee Hills, Hyderabad", ifscCode: "ABC0000602", panNo: "AACPK6020Q", emailId: "kavya.reddy@example.com", source: "HCS" }], pennyDropVerified: false, pennyDropFailed: true, claimSubType: "Reimbursement" },
  { inwardId: "INW/20260708/00166", barcode: "PKG-0000617", totalSheets: 20, docCondition: "Good", source: "Courier", receivedDate: "2026-07-07", referenceId: "REF-78290", policyId: "", surakshaId: "SRK-2026-004617", patientName: "Meena Joshi", proposerName: "Meena Joshi", contactNumber: "9345678912", hospitalName: "Yashoda Hospitals - Somajiguda", createdDate: iso(2026, 7, 8, 9, 20), updatedDate: iso(2026, 7, 8, 9, 20), status: "Active", assignedUser: null, claimStatus: "Not Started", claimId: "CLM-20260708-0166", priority: "Low", claimType: "Health", claimAmount: 19500, medicoStatus: "In Progress", emailStatus: "Opened", claimSubType: "Cashless" },
  { inwardId: "INW/20260709/00172", barcode: "PKG-0000631", totalSheets: 13, docCondition: "Good", source: "Post", receivedDate: "2026-07-09", referenceId: "", policyId: "HE/HGP/21020101/00/000631", surakshaId: "", patientName: "Rahul Chawla", proposerName: "", contactNumber: "9456789123", hospitalName: "Care Hospitals - Banjara Hills", createdDate: iso(2026, 7, 9, 13, 40), updatedDate: iso(2026, 7, 9, 13, 40), status: "Active", assignedUser: null, claimStatus: "Not Started", claimId: "CLM-20260709-0172", priority: "Medium", claimType: "Accident", claimAmount: 63500, medicoStatus: "In Progress", emailStatus: "Pending", claimSubType: "Reimbursement" },
  { inwardId: "INW/20260710/00179", barcode: "PKG-0000648", totalSheets: 7, docCondition: "Damaged", source: "Call Centre", receivedDate: "2026-07-10", referenceId: "REF-78355", policyId: "", surakshaId: "SRK-2026-004648", patientName: "Shubham Thakre", proposerName: "Ayushi P", contactNumber: "9876540102", hospitalName: "Yashoda Hospitals - Somajiguda", createdDate: iso(2026, 7, 10, 15, 5), updatedDate: iso(2026, 7, 10, 15, 5), status: "Pending - Claim Intimation", assignedUser: "Priya Sharma", claimStatus: "In Progress", claimId: "CLM-20260710-0179", priority: "High", claimType: "Health", claimAmount: 138000, medicoStatus: "In Progress", emailStatus: "Closed", claimSubType: "Reimbursement" },
];

/* Seeds every record with a small set of already-attached documents (mix of
   "received" and "uploaded by you") so the Documents card's grouped/
   accordion "Already Attached Documents" section always has something to
   show when a record is opened via any route — Medico, Non Medico, QC,
   CMO, CEM (process-claim.html's shared card-meddocuments) and Claim
   Intimation (index.html) — instead of only appearing for the handful of
   flows/records that happened to have mock docs hand-authored elsewhere
   (e.g. IE_NEW_ACTIVE_CLAIM_DOCS_MOCK in app.js). Doesn't touch records
   that already have documents set (e.g. by a later mock block). Hardcodes
   the category names (matching DOCUMENT_CATEGORIES in
   shared/shared-components.js) rather than referencing that constant,
   since this script loads before shared-components.js. */
(function seedEntryDocuments() {
  function mockFile(name) {
    return new File([new Blob(["Mock document"], { type: "application/pdf" })], name, { type: "application/pdf" });
  }
  entries.forEach(function (rec) {
    if (rec.documents) return;
    const slug = rec.inwardId.split("/").pop();
    // Each category holds an array of documents — a category isn't
    // capped at one file, so adding another later appends instead of
    // overwriting what's already attached.
    rec.documents = {
      "Discharge Summary": [{ fileName: `discharge-summary-${slug}.pdf`, fileSize: "612 KB", file: mockFile(`discharge-summary-${slug}.pdf`), uploadedBy: "received", uploadedAt: new Date(rec.createdDate || Date.now()).getTime() }],
      "Final Bill and Receipts": [{ fileName: `final-bill-${slug}.pdf`, fileSize: "384 KB", file: mockFile(`final-bill-${slug}.pdf`), uploadedBy: "received", uploadedAt: new Date(rec.createdDate || Date.now()).getTime() }],
      "Duly Signed Claim Form": [{ fileName: `claim-form-${slug}.pdf`, fileSize: "205 KB", file: mockFile(`claim-form-${slug}.pdf`), uploadedBy: "you", uploadedAt: new Date(rec.createdDate || Date.now()).getTime() }]
    };
  });
})();

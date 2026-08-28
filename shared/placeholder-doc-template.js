/* ==========================================================================
   ABC HCP — Shared "Coming Soon" placeholder document template
   Extracted from app.js / process-claim.js (both had a byte-identical copy,
   used by the Claim Info / Claim Diary / Claim History reference-panel links,
   none of which have a real implementation yet in this prototype) — no
   behaviour change.
   ========================================================================== */

function placeholderDocHTML(title, claimLabel) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + ' | ABC Health Claims Portal</title>'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">'
    + '<style>body{font-family:"Inter",system-ui,sans-serif;background:#F1F4F8;color:#0F172A;margin:0;padding:60px 40px;display:flex;align-items:center;justify-content:center;min-height:100vh;}'
    + '.wrap{max-width:520px;text-align:center;background:#fff;border-radius:16px;padding:44px 36px;box-shadow:0 1px 12px rgba(27,37,89,0.08);}'
    + '.icon{width:56px;height:56px;border-radius:14px;background:#DBEAFE;color:#1E40AF;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;}'
    + 'h1{font-size:19px;margin:0 0 8px;}p{font-size:13.5px;color:#6B7280;line-height:1.6;margin:0;}'
    + '.tag{display:inline-block;margin-top:18px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;background:#FDF1DA;color:#B4740F;padding:6px 14px;border-radius:20px;}</style></head>'
    + '<body><div class="wrap"><div class="icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg></div>'
    + '<h1>' + title + '</h1><p>This section for ' + claimLabel + ' is planned for a future iteration of this prototype.</p><span class="tag">Coming Soon</span></div></body></html>';
}

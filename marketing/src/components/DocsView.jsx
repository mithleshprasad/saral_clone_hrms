import { useState, useEffect } from 'react';
import { PLANS, COMPARISON_ROWS } from '../data/plans';

const CHAPTERS = [
    'Getting Around', 'Organization Setup', 'Employees', 'Attendance & Leave',
    'Running Payroll', 'Statutory Filing', 'Reports', 'Recruitment',
    'Self-Service Portal', 'Import & Export', 'Shortcuts & Windows',
    'Licensing & Subscriptions', 'Plans & Pricing', 'FAQ',
];

// Prefixed so a chapter's anchor id can never collide with a landing-page section id (both
// pages share one DOM now) — "FAQ" the chapter vs. #faq the landing section was a real
// duplicate-id bug: two elements answering to the same anchor, undefined which one wins.
function slug(name) {
    return 'doc-' + name.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const RESPONSIVE_CSS = `
  .gd-toc a { transition: background 0.12s ease, color 0.12s ease; }
  @media (max-width: 480px) {
    .gd-plan-grid { grid-template-columns: 1fr !important; }
  }
`;

const FAQS = [
    ['Why is an employee’s net pay showing negative?',
        'It happens when someone has zero (or near-zero) attendance for the whole period: Loss of Pay wipes out the full month’s entitlement, but fixed deductions like PF and Professional Tax still apply since they aren’t attendance-linked. The result is a small negative balance owed back — mathematically correct, not a bug. Check the Attendance column on Pay Slip to confirm the day-count behind it.'],
    ['Why does ESI show ₹0 for some employees?',
        'ESI only applies when it’s enabled for that employee, and their gross salary is at or under the ESI wage threshold (₹21,000 by default). Cross that threshold and ESI correctly stops applying — it isn’t a bug if a higher earner shows zero.'],
    ['Where do I see one employee’s attendance history?',
        'Open their record (Master → Employee Details), then the Attendance tab — pick any date range and see their day-by-day history plus a status summary, without leaving that screen.'],
    ['Where do I see everyone’s attendance at once?',
        'Report → Muster Roll — every employee, every day of the selected month, in one compact colour-coded grid. Daily Attendance (under the Attendance menu) also shows everyone, but for one day at a time.'],
    ['How do I check that a payslip’s LOP figure is correct?',
        'The Pay Slip screen has an Attendance column right next to LOP, showing present days out of total period days for every row — the same numbers driving the Muster Roll and each employee’s own Attendance tab, so all three always agree.'],
    ['An employee is missing from the Muster Roll — why?',
        'Check their Date of Joining on the employee form. It’s an optional field, but if it’s left blank the employee won’t show up correctly on attendance registers for that period. Set it and they’ll appear.'],
    ['Can I edit a payslip after it’s already generated?',
        'Yes — Salary Transactions → Salary Editor lets you hand-edit any individual payslip’s components after the fact; gross and net recalculate immediately. It doesn’t change the employee’s underlying salary structure for future periods.'],
    ['What happens if I run payroll twice for the same period?',
        'By default the run skips any employee already processed for that period rather than creating a duplicate payslip — controlled by the “Skip employees already processed” checkbox on the Run Payroll screen.'],
    ['How do I stop a closed month from being edited?',
        'Salary Transactions → Pay Periods → close the month. Payroll can’t be generated or edited for that company/period again until it’s explicitly reopened.'],
    ['What’s the difference between Old and New tax regime?',
        'New regime (the default) ignores investment declarations entirely, by law. Old regime honors approved 80C/80D/HRA/home-loan declarations when estimating TDS. Set it per employee on their Statutory tab.'],
    ['Can I switch to another open window while a form is mid-edit?',
        'Yes — the taskbar at the bottom always stays reachable, even with an unsaved form open elsewhere. Switching away doesn’t discard that form’s contents; only closing that specific window does.'],
    ['Who can log into which application?',
        'Everyone signs into the same app — what you see depends on your role. Admin/HR get the full console. Employees get a locked-down self-service view of only their own records. The platform owner (Super Admin) gets the same console plus an Application Control menu for managing companies’ subscriptions.'],
    ['Is data isolated between companies?',
        'Yes — every list, report, and calculation is scoped to the company selected in the context bar. Cross-company data leakage is explicitly tested for on every module.'],
];

function FaqAccordion() {
    const [openIdx, setOpenIdx] = useState(0);
    return (
        <div>
            {FAQS.map(([q, a], i) => {
                const open = openIdx === i;
                return (
                    <div key={q} style={styles.faqItem}>
                        <div style={styles.faqQ} onClick={() => setOpenIdx(open ? -1 : i)}>
                            <span>{q}</span>
                            <span style={styles.faqCaret}>{open ? '−' : '+'}</span>
                        </div>
                        {open && <p style={styles.faqA}>{a}</p>}
                    </div>
                );
            })}
        </div>
    );
}

function Figure({ src, caption }) {
    return (
        <figure style={styles.figure}>
            <img src={src} alt={caption} style={styles.figureImg} />
            <figcaption style={styles.figcaption}>{caption}</figcaption>
        </figure>
    );
}

const REF_ROWS = [
    ['PF ECR', 'Monthly EPFO Electronic Challan-cum-Return', 'Every PF-enabled employee that period.'],
    ['ESI Return', 'Monthly ESIC contribution return', 'Employees with gross at or under the ESI wage threshold.'],
    ['PT Register', 'State Professional Tax', "Uses the state-specific slab table when the company's state is mapped."],
    ['LWF Register', 'Labour Welfare Fund', 'State- and category-dependent contribution.'],
    ['Bonus Register', 'Payment of Bonus Act annual bonus', 'Only employees averaging ≤ ₹21,000 gross across the FY are eligible — a real statutory ceiling.'],
    ['Gratuity Register', 'Accrued gratuity liability', '5+ years of service only. 15 × last drawn (Basic+DA) × years ÷ 26.'],
    ['Form 24Q (CSV & NSDL)', 'Quarterly TDS return on salaries', 'NSDL format includes the FH/BH/CD/DD record structure for direct upload.'],
    ['Form 16', 'Annual TDS certificate', 'Per employee, per financial year.'],
    ['Form 3A / 5 / 10', 'Annual PF returns', 'Year-end PF filings.'],
    ['Bank files (SBI / HDFC / ICICI)', 'Salary disbursement upload', "Formatted to each bank's own bulk-upload layout."],
];

function Chapter({ index, title, children }) {
    return (
        <section id={slug(title)} style={styles.chapterBlock}>
            <div style={styles.chapterEyebrow}>CHAPTER {String(index + 1).padStart(2, '0')} / {CHAPTERS.length}</div>
            {children}
        </section>
    );
}

// This used to be a sidebar + click-to-switch widget (one chapter visible at a time,
// swapped in place) — which still read as "a little app bolted onto the page" even after
// the outer view-swap was removed. Every chapter now renders in sequence, all at once, as
// one continuous scrollable document; the row below is just a jump-to-section shortcut
// (anchor links, same mechanism as the rest of this page), not a UI mode switch.
export default function DocsView({ initialChapter }) {
    useEffect(() => {
        if (!initialChapter) return;
        const el = document.getElementById(slug(initialChapter));
        if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, [initialChapter]);

    return (
        <div style={styles.page}>
            <style>{RESPONSIVE_CSS}</style>

            <div style={styles.sectionHead}>
                <div style={styles.eyebrow}>DOCUMENTATION</div>
                <h2 style={styles.sectionH2}>Everything you need to know</h2>
                <p style={styles.sectionSub}>Fourteen chapters, written for the app as it actually behaves — not marketing copy.</p>
            </div>

            <nav className="gd-toc" style={styles.tocRow}>
                {CHAPTERS.map((c, i) => (
                    <a
                        key={c}
                        href={`#${slug(c)}`}
                        style={styles.tocPill}
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(slug(c))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        <span style={styles.tocNum}>{i}</span>{c}
                    </a>
                ))}
            </nav>

            <div style={styles.docBody}>
                <Chapter index={0} title="Getting Around">
                    <h1 style={styles.h1}>How the app is laid out</h1>
                    <p style={styles.p}>Every screen is reached from the <strong>menu bar</strong> across the top. The row of icons beneath it is a shortcut toolbar that changes based on what module you're in.</p>
                    <p style={styles.p}>Open a screen and it appears as its own <strong>window</strong> inside the workspace, with its own title bar and minimize/maximize/close controls — open several at once and switch between them from the <strong>taskbar</strong> at the bottom, the same way classic desktop software works. Switching windows via the taskbar never discards unsaved work in another window — only closing that specific window does.</p>
                    <p style={styles.p}>Top-right: <strong>Company</strong>, <strong>FY</strong>, and <strong>Month</strong> selectors. Almost everything — attendance, payroll, reports — is scoped to whichever company and period are selected there, and every open window updates automatically when you change them.</p>
                    <Figure src="/screenshots/getting-around-1.png" caption="The workspace right after signing in — menu bar and toolbar up top, taskbar along the bottom." />
                    <Figure src="/screenshots/getting-around-2.png" caption="Four windows open at once — Dashboard, Company Details, Departments, and Daily Attendance — each with its own taskbar chip." />
                </Chapter>

                <Chapter index={1} title="Organization Setup">
                    <h1 style={styles.h1}>Company → Branches/Departments → Positions → Employees</h1>
                    <p style={styles.p}>Create the company first (<span style={styles.path}>File → Company Details</span>). Its <strong>state</strong> matters beyond the address — it drives which Professional Tax slab table applies and whether LWF is deducted, both computed automatically at payroll time.</p>
                    <p style={styles.p}>Branches, Departments and Positions live under <span style={styles.path}>Initial Settings</span>. A Position carries a default salary (used when an employee has none of their own), a probation length, and whether the role is subject to PT/LWF — set once, inherited by everyone in that role.</p>
                    <h2 style={styles.h2}>Salary structures</h2>
                    <p style={styles.p}>Build a template once (<span style={styles.path}>Master → Salary Structure</span>) out of components — Basic, DA, HRA, Conveyance, Medical, Special — each fixed or a percentage of another component. Apply it to any employee and the percentages resolve into real rupee figures at that moment, based on their Basic.</p>
                </Chapter>

                <Chapter index={2} title="Employees">
                    <h1 style={styles.h1}>Adding &amp; managing employees</h1>
                    <h2 style={styles.h2}>Single entry</h2>
                    <p style={styles.p}><span style={styles.path}>Master → Employee Details → New Employee</span>. The form is tabbed: personal, contact, employment, salary, and statutory (PF/ESI opt-in, PAN, tax regime).</p>
                    <p style={styles.p}><strong>Tax regime matters immediately</strong> — it's read every payroll run. New regime ignores investment declarations by law; Old regime honors them.</p>
                    <p style={styles.p}>From the same record you can also attach <strong>documents</strong>, add <strong>onboarding tasks</strong>, record <strong>perquisites</strong>, and — on the <strong>Attendance</strong> tab — view that one employee's attendance history for any date range, with a status summary. That's the fastest way to check or manually verify what a specific employee's attendance looked like, including cross-checking it against a payslip's LOP figure.</p>
                    <Figure src="/screenshots/employees-1.png" caption="The employee form — personal details, employment info, salary, and statutory fields across separate tabs." />
                    <Figure src="/screenshots/employees-2.png" caption="Employee Details → Attendance tab — one person's own history, with a From/To range and a status summary." />
                    <h2 style={styles.h2}>Bulk import</h2>
                    <p style={styles.p}><span style={styles.path}>Import/Export → Import Employees</span>. Column headers match flexibly (case/whitespace-insensitive). Rows missing a required field are skipped individually with a stated reason — the whole batch never fails because of one bad row.</p>
                </Chapter>

                <Chapter index={3} title="Attendance & Leave">
                    <h1 style={styles.h1}>Attendance &amp; leave</h1>
                    <h2 style={styles.h2}>Four ways attendance reaches the system</h2>
                    <ul style={styles.ul}>
                        <li style={styles.li}><strong>Manual, one day at a time</strong> — <span style={styles.path}>Attendance → Daily Attendance</span>.</li>
                        <li style={styles.li}><strong>Biometric punch import</strong> — upload the device export; rows match by employee code.</li>
                        <li style={styles.li}><strong>Regularization requests</strong> — correct a day after the fact; a rejected request never touches the underlying record.</li>
                        <li style={styles.li}><strong>Shift rosters</strong> — assign a shift across a date range; its hours become the basis for overtime.</li>
                    </ul>
                    <Figure src="/screenshots/attendance-1.png" caption="Assigning a shift across a date range — overtime is computed against whatever shift is on record for that day." />
                    <h2 style={styles.h2}>Muster Roll — everyone, one screen</h2>
                    <p style={styles.p}><span style={styles.path}>Report → Muster Roll</span> shows every employee across the whole month in one compact grid, colour-coded per day. Precedence when a day has more than one thing true about it: an <strong>explicit mark</strong> always wins; then <strong>approved leave</strong>; then <strong>company holiday</strong>; otherwise it's Absent — a payroll system can't assume presence without proof.</p>
                    <Figure src="/screenshots/attendance-2.png" caption="Muster Roll — every employee, every day of the month, colour-coded and legible at a glance." />
                    <h2 style={styles.h2}>Overtime — OT1/OT2 gates</h2>
                    <p style={styles.p}>Hours up to a configured threshold pay at the OT1 rate, anything beyond it at the richer OT2 rate — computed automatically from logged overtime hours when payroll runs.</p>
                </Chapter>

                <Chapter index={4} title="Running Payroll">
                    <h1 style={styles.h1}>Running payroll</h1>
                    <h2 style={styles.h2}>The calculation sequence</h2>
                    <ol style={styles.ul}>
                        <li style={styles.li}>Start from the monthly entitlement: Basic + DA + HRA + Conveyance + Medical + Special, from the employee's own salary structure (or their Position's default).</li>
                        <li style={styles.li}><strong>Attendance drives Loss of Pay, not a shrunken salary.</strong> LOP = (entitlement ÷ working days) × days absent, shown as its own deduction line — Basic/DA/HRA stay at full value, so LOP does the work of reducing pay exactly once.</li>
                        <li style={styles.li}>Statutory deductions apply to that gross: PF (default 12% of Basic+DA, capped at the wage ceiling), ESI (only if enabled <em>and</em> gross ≤ threshold), PT (state slab or flat), TDS (regime-aware).</li>
                        <li style={styles.li}>Loans and user-defined deductions come off last.</li>
                        <li style={styles.li}>Net pay is what's left.</li>
                    </ol>
                    <Figure src="/screenshots/payroll-1.png" caption="Running payroll for a period — every eligible employee is processed in one pass." />
                    <p style={styles.warnBox}>
                        <strong>A negative net pay is real, not a glitch.</strong> Zero attendance for a whole period means LOP equals the full month's salary — but PF/PT and other fixed deductions still apply, so the result can be a small negative balance. It's mathematically correct.
                    </p>
                    <h2 style={styles.h2}>Checking the math yourself</h2>
                    <p style={styles.p}>The <span style={styles.path}>Pay Slip</span> screen has an <strong>Attendance</strong> column right next to LOP — present days out of total days, colour-coded — so any LOP figure can be verified against the exact day-count behind it, without switching screens. It always agrees with the Muster Roll and each employee's own Attendance tab.</p>
                    <Figure src="/screenshots/payroll-2.png" caption="Pay Slip — the Attendance column shows exactly how many days each LOP figure was calculated from." />
                    <h2 style={styles.h2}>Locking, Salary Editor, F&amp;F</h2>
                    <p style={styles.p}>Closing a month (<span style={styles.path}>Pay Periods</span>) blocks further generation until reopened. The <span style={styles.path}>Salary Editor</span> lets you hand-edit any individual payslip after the fact. <span style={styles.path}>F&amp;F Settlement</span> seeds an exiting employee's last pay and pending loan balance as starting line items.</p>
                </Chapter>

                <Chapter index={5} title="Statutory Filing">
                    <h1 style={styles.h1}>Statutory filing</h1>
                    <p style={styles.p}><span style={styles.path}>Report → Statutory Reports</span> — every export reads directly from payroll data already generated, scoped to the Company/FY/Month in the context bar. Set those first, then open the export.</p>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                            <thead><tr><th style={styles.th}>File</th><th style={styles.th}>What it's for</th><th style={styles.th}>Notes</th></tr></thead>
                            <tbody>
                                {REF_ROWS.map(([a, b, c]) => (
                                    <tr key={a}><td style={styles.td}>{a}</td><td style={styles.td}>{b}</td><td style={styles.td}>{c}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Figure src="/screenshots/statutory-1.png" caption="Every statutory export in one place, scoped to the company and period selected in the context bar." />
                </Chapter>

                <Chapter index={6} title="Reports">
                    <h1 style={styles.h1}>Reports</h1>
                    <p style={styles.p}>Under <span style={styles.path}>Report</span>: Salary Sheet, PF/ESI Statement, Department-wise Summary, Loan/Advance Ledger, Yearly Salary — plus a Report Writer for custom column sets beyond the fixed list. Every report is scoped by the context bar, and every CSV export matches the on-screen figures exactly.</p>
                </Chapter>

                <Chapter index={7} title="Recruitment">
                    <h1 style={styles.h1}>Recruitment</h1>
                    <p style={styles.p}>Post a job (<span style={styles.path}>Recruitment → Jobs</span>), log candidates, schedule interviews and record feedback, then convert an offered candidate directly into an employee — name and contact carry over automatically — with an Offer or Appointment letter generated in the same step.</p>
                    <Figure src="/screenshots/recruitment-1.png" caption="Scheduling an interview against a candidate." />
                </Chapter>

                <Chapter index={8} title="Self-Service Portal">
                    <h1 style={styles.h1}>Employee self-service portal</h1>
                    <p style={styles.p}>A lighter, locked-down view of the same app — an employee signs in with the same login screen as everyone else, and their role automatically routes them here instead of the admin console. They can view/download their own payslips and Form 16, check attendance and request regularization, apply for leave, save/submit tax declarations (Old regime), and view documents and letters issued to them.</p>
                    <p style={styles.dangerBox}>
                        <strong>Security boundary:</strong> every ESS view is locked to the logged-in employee's own records at the server, not just hidden in the interface — no account can be pointed at another employee's data by any means.
                    </p>
                    <Figure src="/screenshots/ess-1.png" caption="The ESS dashboard — an employee's own view: payslips, attendance, leave, and documents only." />
                </Chapter>

                <Chapter index={9} title="Import & Export">
                    <h1 style={styles.h1}>Import &amp; export</h1>
                    <p style={styles.p}>One screen for both directions (<span style={styles.path}>Import/Export</span>): bulk-import employees from a spreadsheet; export the full employee master or any statutory report straight to CSV for the currently selected period.</p>
                    <Figure src="/screenshots/import-export-1.png" caption="Import/Export — bulk employee import and every statutory CSV export in one place." />
                </Chapter>

                <Chapter index={10} title="Shortcuts & Windows">
                    <h1 style={styles.h1}>Shortcuts &amp; window management</h1>
                    <h2 style={styles.h2}>Menu mnemonics</h2>
                    <p style={styles.p}>Every top-level menu opens with <kbd style={styles.kbd}>Alt</kbd> + its underlined letter — File (<kbd style={styles.kbd}>Alt+F</kbd>), Initial Settings (<kbd style={styles.kbd}>Alt+I</kbd>), Master (<kbd style={styles.kbd}>Alt+M</kbd>), Attendance (<kbd style={styles.kbd}>Alt+A</kbd>), Report (<kbd style={styles.kbd}>Alt+R</kbd>), Import/Export (<kbd style={styles.kbd}>Alt+P</kbd>).</p>
                    <h2 style={styles.h2}>Windows</h2>
                    <p style={styles.p}>Every window can be dragged by its title bar, minimized to the taskbar without closing, and restored with state (including unsaved edits) intact. Open as many as you need — the taskbar always stays reachable to switch between them, even while a form is open elsewhere.</p>
                </Chapter>

                <Chapter index={11} title="Licensing & Subscriptions">
                    <h1 style={styles.h1}>Licensing &amp; subscriptions</h1>
                    <p style={styles.p}>This is for <strong>you</strong>, the vendor — not something a client ever sees. Every client you sell to gets their <strong>own separate installation</strong> (their own server and database, on their own machine or hosting). There's no shared login between clients — instead, each installation quietly checks in with one central service you control, confirming it's still allowed to run.</p>

                    <h2 style={styles.h2}>The two pieces</h2>
                    <ul style={styles.ul}>
                        <li style={styles.li}><strong>License Server</strong> (runs on port 4001) — the central database of every client you've ever sold to: their license key, plan, expiry, status. Every deployed client installation calls this quietly in the background — never something a client logs into directly.</li>
                        <li style={styles.li}><strong>License Control</strong> — the screen <em>you</em> use, tucked inside this same site behind a quiet <strong>Partner / License Admin</strong> link in the footer (not in the main menu — it's an internal tool, not something a client needs to find). Issue licenses, record payments, edit plans. Sign in with your vendor account.</li>
                    </ul>

                    <h2 style={styles.h2}>Walkthrough: selling to a new client</h2>
                    <ol style={styles.ul}>
                        <li style={styles.li}><strong>A business — say, "Acme Traders" — agrees to buy.</strong> You decide they fit the Growth plan (up to 100 employees).</li>
                        <li style={styles.li}><strong>Open License Control, go to "Issue a new license."</strong> Enter their name, email, pick the Growth plan, set an expiry date (typically one billing period out — a month or a year from today), hit <strong>Issue License</strong>.</li>
                        <li style={styles.li}><strong>A license key appears</strong> — something like <code style={styles.pathInline}>MPXHR-1F0E-8585-D3BC-8578</code>. Copy it.</li>
                        <li style={styles.li}><strong>Set up their installation</strong> (or send them instructions): their own copy of the <span style={styles.path}>server/</span> app gets that key in its <code style={styles.pathInline}>LICENSE_KEY</code> setting. Nothing else changes — the app they use looks identical.</li>
                        <li style={styles.li}><strong>That's it for day-to-day.</strong> Their installation checks in with the license server every few hours in the background. As long as their license is Active and not past its expiry, everything works normally, capped at whatever their plan allows (Growth: up to 100 employees, 3 companies, statutory filing + ESS + recruitment included).</li>
                    </ol>

                    <h2 style={styles.h2}>What happens at renewal time</h2>
                    <p style={styles.p}>Their license quietly passes its expiry date. Nothing dramatic happens immediately — their installation switches to <strong>read-only mode</strong>: they can still log in and see everything, but can't create or edit anything (no new payroll runs, no new employees) until you extend it. Within a few hours of you recording their renewal payment, their installation checks in again and full access resumes automatically — no reinstall, no new key needed.</p>

                    <h2 style={styles.h2}>Getting paid: the QR code and Record Payment</h2>
                    <p style={styles.p}>Under <strong>Payment Settings</strong> in License Control, set the UPI ID clients should pay into. The QR code next to it is generated live from that ID — change the UPI ID and the QR changes with it, there's nothing to design or re-upload. Share that QR (or the UPI ID directly) with a client when it's time to renew.</p>
                    <p style={styles.p}>Once you see the money land in your own bank/UPI app, open their license and click <strong>Record Payment</strong> — enter the amount, how many days it buys, and the UTR/reference number for your own records. That one action does three things at once: logs the transaction (visible later under <strong>Transactions</strong>), extends <code style={styles.pathInline}>expires_at</code>, and reactivates the license if it had lapsed or been suspended. There's no separate "approve" step — recording it is what activates it.</p>

                    <h2 style={styles.h2}>If a client stops paying, or needs to be cut off entirely</h2>
                    <p style={styles.p}>Click <strong>Suspend</strong> on their license. Unlike expiry (read-only), suspension is a full lockout — their installation can't be used at all until you <strong>Reactivate</strong> it. <strong>Revoke</strong> is the permanent version, for when the relationship is over for good.</p>

                    <h2 style={styles.h2}>What a client never sees</h2>
                    <p style={styles.p}>They never log into License Control, never see other clients, never see your pricing catalog. Their own installation just quietly works — or quietly stops working — based on decisions you make in one screen.</p>
                </Chapter>

                <Chapter index={12} title="Plans & Pricing">
                    <div style={styles.pricingHero}>
                        <div style={styles.pricingEyebrow}>PRICING</div>
                        <h1 style={styles.pricingH1}>The reasoning behind the numbers</h1>
                        <p style={styles.pricingSub}>Cards and monthly/annual toggle are up in the <a href="#pricing" style={styles.inlineLink} onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}>Pricing section</a> above — this is the full feature-by-feature comparison, plus how each tier actually got priced.</p>
                    </div>

                    <h2 style={styles.h2}>Compare every feature</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={styles.compareTable}>
                            <thead>
                                <tr>
                                    <th style={styles.compareHeadLabel}></th>
                                    {PLANS.map((p) => (
                                        <th key={p.name} style={{ ...styles.compareHeadPlan, ...(p.highlight ? styles.compareHeadPlanHighlight : {}) }}>{p.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON_ROWS.map((row) => (
                                    <tr key={row.label}>
                                        <td style={styles.compareRowLabel}>{row.label}</td>
                                        {row.values.map((v, i) => (
                                            <td key={i} style={{ ...styles.compareCell, ...(PLANS[i].highlight ? styles.compareCellHighlight : {}) }}>
                                                {v === true ? <i className="fas fa-check" style={styles.compareCheck}></i>
                                                    : v === false ? <i className="fas fa-minus" style={styles.compareDash}></i>
                                                        : <span>{v}</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <h2 style={styles.h2}>Priced against the real market, not guessed</h2>
                    <p style={styles.p}>These numbers come from actually checking Zoho Payroll, greytHR, Keka, and RazorpayX Payroll's published 2026 India pricing — not from picking round numbers that felt reasonable. Two things came out of that comparison:</p>
                    <div className="gd-plan-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, margin: '14px 0 20px' }}>
                        {[
                            ['Zoho Payroll', 'Free ≤10, then ₹40–80/employee'],
                            ['greytHR', 'Free ≤25, then ₹45–100/employee'],
                            ['Keka', 'No free tier, ₹90–160/employee'],
                            ['RazorpayX Payroll', '₹100/employee flat'],
                        ].map(([n, v]) => (
                            <div key={n} style={{ background: '#fff', border: '1px solid #e3e7ea', borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#12161a', marginBottom: 3 }}>{n}</div>
                                <div style={{ fontSize: 11.5, color: '#5b6570' }}>{v}</div>
                            </div>
                        ))}
                    </div>
                    <ul style={styles.ul}>
                        <li style={styles.li}><strong>The free tier is permanent, matching the market — not a 14-day trial.</strong> Zoho and greytHR's free tiers never expire, they're capped by headcount. A time-boxed trial is a much bigger conversion barrier than a small permanent cap, and since every client installation runs on the client's own server, a permanent free tier costs us almost nothing to offer.</li>
                        <li style={styles.li}><strong>Every real competitor gets more expensive per employee as headcount grows</strong> (Zoho: ₹40 → ₹60 → ₹80/employee across its tiers). Ours does the opposite — ₹80 → ₹32 → ₹25 → ₹12/employee — on purpose. Starter roughly matches the market; Growth and Professional undercut everyone by 3–10x at real volume. That gap, not feature parity, is the actual pitch to a prospect already quoted by Zoho or Keka.</li>
                        <li style={styles.li}><strong>Professional's real target is payroll consultancies</strong> running several clients through one installation — the <code style={styles.pathInline}>max_companies</code> cap matters more to that buyer than the employee count, and nobody else prices multi-company this cheap.</li>
                        <li style={styles.li}><strong>Enterprise is deliberately not self-serve.</strong> Large accounts want a conversation and custom terms, not a checkout button.</li>
                    </ul>
                    <p style={styles.p}>The real constraint isn't margin — a self-hosted client costs us close to nothing in infrastructure. It's <em>time</em>: support, bug fixes, and keeping up with statutory rate changes every year. This pricing only works if the Help Center and FAQ keep support load low enough that undercutting the market this aggressively stays sustainable.</p>
                </Chapter>

                <Chapter index={13} title="FAQ">
                    <h1 style={styles.h1}>Frequently asked questions</h1>
                    <p style={styles.p}>The ones that come up most — click a question to expand it.</p>
                    <FaqAccordion />
                </Chapter>
            </div>
        </div>
    );
}

const styles = {
    page: { color: '#171a1e', fontFamily: '"Segoe UI", -apple-system, Arial, sans-serif' },

    sectionHead: { textAlign: 'center', maxWidth: 620, margin: '0 auto 36px' },
    eyebrow: { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.14em', color: '#1f7a6c', marginBottom: 12 },
    sectionH2: { fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 14px', color: '#12161a' },
    sectionSub: { fontSize: 15, lineHeight: 1.6, color: '#5b6570', margin: 0 },

    tocRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 900, margin: '0 auto 48px' },
    tocPill: {
        display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#454c53',
        background: '#fff', border: '1px solid #e3e7ea', borderRadius: 999, padding: '7px 14px', textDecoration: 'none',
    },
    tocNum: { color: '#8b939b', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 11 },

    docBody: {
        maxWidth: 760, margin: '0 auto', background: '#fff', borderRadius: 20, border: '1px solid #eceeec',
        boxShadow: '0 1px 2px rgba(18,22,26,0.03), 0 30px 60px -34px rgba(18,22,26,0.16)',
        padding: '8px 44px 44px',
    },
    chapterBlock: { paddingTop: 44, borderTop: '1px solid #eef1f3' },
    chapterEyebrow: { fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', color: '#8b939b', marginBottom: 10 },

    h1: { fontSize: 24, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.01em' },
    h2: { fontSize: 16.5, fontWeight: 700, margin: '24px 0 8px' },
    p: { fontSize: 14, lineHeight: 1.7, color: '#3c434a', margin: '0 0 13px' },
    ul: { fontSize: 14, lineHeight: 1.7, color: '#3c434a', paddingLeft: 20, margin: '0 0 16px' },
    li: { marginBottom: 8 },
    path: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '0.88em', background: '#eef1f3', border: '1px solid #dde2e6', borderRadius: 4, padding: '1px 6px', color: '#0f4a41' },
    kbd: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 12, background: '#e9edf0', border: '1px solid #c7cdd2', borderBottomWidth: 2, borderRadius: 4, padding: '1px 7px' },
    warnBox: { background: '#fdf6e3', border: '1px solid #b5790f', borderRadius: 8, padding: '12px 16px', fontSize: 13.5, color: '#3c434a' },
    dangerBox: { background: '#faeceb', border: '1px solid #b3352f', borderRadius: 8, padding: '12px 16px', fontSize: 13.5, color: '#3c434a' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
    th: { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#757d85', padding: '7px 10px', borderBottom: '1px solid #dde2e6' },
    td: { padding: '8px 10px', borderBottom: '1px solid #e8ecef', color: '#3c434a', verticalAlign: 'top' },
    figure: { margin: '18px 0 22px' },
    figureImg: { width: '100%', height: 'auto', display: 'block', borderRadius: 8, border: '1px solid #dde2e6', boxShadow: '0 1px 2px rgba(23,26,30,0.05), 0 12px 30px -18px rgba(23,26,30,0.22)' },
    figcaption: { fontSize: 12, color: '#757d85', marginTop: 8 },
    faqItem: { borderBottom: '1px solid #e8ecef', padding: '4px 0' },
    faqQ: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 2px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#171a1e' },
    faqCaret: { color: '#0f4a41', fontSize: 18, fontWeight: 700, flexShrink: 0 },
    faqA: { fontSize: 13.5, lineHeight: 1.65, color: '#3c434a', margin: '0 0 14px', maxWidth: 640 },
    pathInline: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '0.88em', background: '#eef1f3', border: '1px solid #dde2e6', borderRadius: 4, padding: '1px 6px', color: '#0f4a41' },

    pricingHero: { textAlign: 'center', margin: '0 auto 40px' },
    pricingEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#1f7a6c', marginBottom: 10 },
    pricingH1: { fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px', color: '#12161a' },
    pricingSub: { fontSize: 14.5, lineHeight: 1.6, color: '#5b6570', margin: '0 0 26px' },
    inlineLink: { color: '#1f7a6c', fontWeight: 700, textDecoration: 'none' },

    compareTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginTop: 6 },
    compareHeadLabel: { minWidth: 200 },
    compareHeadPlan: { textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: '#12161a', padding: '10px 14px', borderBottom: '2px solid #e3e7ea' },
    compareHeadPlanHighlight: { color: '#0f4a41', background: '#f2f8f6' },
    compareRowLabel: { padding: '10px 14px', color: '#3c434a', fontWeight: 600, borderBottom: '1px solid #eef1f3', whiteSpace: 'nowrap' },
    compareCell: { textAlign: 'center', padding: '10px 14px', borderBottom: '1px solid #eef1f3', color: '#3c434a' },
    compareCellHighlight: { background: '#f2f8f6' },
    compareCheck: { color: '#1f7a6c', fontSize: 13 },
    compareDash: { color: '#c7cdd2', fontSize: 10 },
};

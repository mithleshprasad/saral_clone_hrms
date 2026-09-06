import { useState, useEffect, Suspense, lazy } from 'react';
import Reveal from './components/Reveal';
import DocsView from './components/DocsView';
import SignupModal from './components/SignupModal';
import { PLANS } from './data/plans';

// Support tier per plan, same order as PLANS — kept alongside rather than inside plans.js
// since it's only ever rendered here, in the pricing panel's footer row.
const SUPPORT_LABELS = ['Community', 'Email', 'Email', 'Priority email', 'Dedicated'];

// Lazy: pulls in axios + its own stylesheets, only needed by the small internal-admin audience.
const AdminApp = lazy(() => import('./admin/AdminApp'));

// One login for everyone — Admin/HR, Employee, and Super Admin all sign in here and land
// on the workspace their role resolves to; there's no separate ESS URL anymore.
const WEB_APP_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:5173';
const DESKTOP_DOWNLOAD_URL = '/downloads/MpxHR-Setup.exe';

const FEATURES = [
    { icon: 'fa-file-invoice-dollar', title: 'Payroll Engine', desc: 'PF, ESI, PT, TDS — both tax regimes — computed automatically, every run.' },
    { icon: 'fa-calendar-check', title: 'Attendance & Leave', desc: 'Biometric punch import, shift rosters, an overtime engine with real OT1/OT2 gates.' },
    { icon: 'fa-file-shield', title: 'Statutory Filing', desc: 'PF ECR, ESI, PT/LWF registers, Form 24Q + NSDL, Form 16 — generated, not typed by hand.' },
    { icon: 'fa-users-gear', title: 'Self-Service Portal', desc: 'Employees view payslips, apply for leave, and submit tax declarations themselves.' },
    { icon: 'fa-briefcase', title: 'Recruitment', desc: 'Post jobs, track candidates, convert an offer straight into an employee record.' },
    { icon: 'fa-chart-line', title: 'Reports & MIS', desc: 'Salary sheets, department summaries, loan ledgers — on screen and as CSV, always in sync.' },
];

const SHOWCASE = [
    { img: '/screenshots/dashboard.png', label: 'One workspace, multiple windows', desc: 'A real multi-window desktop interface — open Payroll, Attendance, and Reports side by side, exactly like classic desktop software.' },
    { img: '/screenshots/payroll.png', label: 'Payroll you can verify', desc: "Every payslip's Loss-of-Pay figure sits next to the exact attendance days it was calculated from — nothing to take on faith." },
    { img: '/screenshots/attendance.png', label: 'Every employee, every day, one screen', desc: 'A full month’s attendance register, colour-coded and legible at a glance.' },
    { img: '/screenshots/ess.png', label: 'Employees serve themselves', desc: 'Payslips, attendance, leave requests, tax declarations — without a single email to HR.' },
];

const FAQS = [
    ['Where does our data live?', 'On your own server — each installation is independent. We never host or see your payroll data.'],
    ['Can I try it before paying?', 'Yes — the Free plan is permanent (not a trial) for up to 10 employees, one company. No card required.'],
    ['Is there a desktop app?', 'Yes — a native Windows installer that wraps the same application in a proper desktop window.'],
    ['What happens if I outgrow my plan?', 'Upgrade any time — your data and setup carry over, nothing to migrate.'],
];

function Brand({ onGoHome }) {
    return (
        <a href="#" onClick={(e) => { e.preventDefault(); onGoHome(); }} style={{ ...s.brand, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
            <i className="fas fa-cube" style={{ marginRight: 9, color: '#5cc9b8' }}></i>MpxHR
        </a>
    );
}

function Nav({ onNavigate, onGoHome, onSignup }) {
    const [open, setOpen] = useState(false);

    const go = (hash) => (e) => {
        e.preventDefault();
        setOpen(false);
        onNavigate(hash);
    };
    return (
        <header style={s.nav}>
            <div style={s.navInner}>
                <Brand onGoHome={onGoHome} />
                <nav style={s.navLinks} className={`mkt-navlinks ${open ? 'mkt-open' : ''}`}>
                    <a href="#features" style={s.navLink} onClick={go('features')}>Features</a>
                    <a href="#showcase" style={s.navLink} onClick={go('showcase')}>Product</a>
                    <a href="#pricing" style={s.navLink} onClick={go('pricing')}>Pricing</a>
                    <a href="#download" style={s.navLink} onClick={go('download')}>Desktop App</a>
                </nav>
                <div style={s.navCtas} className="mkt-navctas">
                    <button type="button" style={{ ...s.navCta, border: 'none', cursor: 'pointer' }} onClick={() => { setOpen(false); onSignup('Free'); }}>Sign Up</button>
                </div>
                <button className="mkt-burger" style={s.burger} onClick={() => setOpen((v) => !v)} aria-label="Menu">
                    <i className={`fas ${open ? 'fa-xmark' : 'fa-bars'}`}></i>
                </button>
            </div>
        </header>
    );
}

export default function App() {
    // One continuous page — landing content and the full docs live in the same scroll,
    // "navigating" to Docs is just a smooth-scroll like Features/Pricing/FAQ already are,
    // not a swap to a different screen. Admin (License Control) is the one real exception:
    // it's an authenticated internal tool, not public content, so it stays a separate,
    // deliberately-gated mode reached only via `#admin` or the quiet footer link.
    const [isAdmin, setIsAdmin] = useState(() => window.location.hash === '#admin');
    const [docsChapter, setDocsChapter] = useState(null);
    const [signupPlan, setSignupPlan] = useState(null);
    const [billingAnnual, setBillingAnnual] = useState(false);

    // The browser's own "jump to #fragment on load" never actually works here: on first
    // paint this is an empty SPA shell (just <div id="root">), so every section id the
    // fragment could point at doesn't exist yet when the browser makes its one-shot native
    // attempt — it silently fails, and nothing retries it once React finishes rendering.
    // #docs was the only one that worked before, because it alone had this exact fix
    // written for it by hand; every other anchor (#faq, #pricing, #download, ...) was
    // still relying on the broken native behavior. This covers all of them at once.
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (!hash || hash === 'admin') return;
        requestAnimationFrame(() => {
            document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
        });
    }, []);

    function navigateToSection(hash) {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }

    function openDocs(chapter) {
        setDocsChapter(chapter || null);
        requestAnimationFrame(() => {
            document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    function openAdmin() {
        window.location.hash = '#admin';
        setIsAdmin(true);
        window.scrollTo(0, 0);
    }

    function goHome() {
        if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
        setIsAdmin(false);
        window.scrollTo(0, 0);
    }

    if (isAdmin) {
        return (
            <Suspense fallback={null}>
                <AdminApp onExit={goHome} />
            </Suspense>
        );
    }

    return (
        <div style={s.page}>
            <style>{CSS}</style>
            <Nav onNavigate={navigateToSection} onGoHome={goHome} onSignup={setSignupPlan} />

            {/* ---- HERO ---- */}
            <section style={s.hero}>
                <div style={s.heroCenter}>
                    <div style={s.heroEyebrow}>PAYROLL &amp; HR SOFTWARE FOR INDIAN BUSINESSES</div>
                    <h1 style={s.heroH1}>Payroll made easy,<br />scalable, and <em style={s.heroEmphasis}>compliant</em>.</h1>
                    <p style={s.heroSub}>PF, ESI, PT, and TDS computed correctly every time — with attendance-backed proof behind every rupee, on your own server, under your own control.</p>
                    <div style={s.heroCtas} className="mkt-hero-ctas">
                        <button type="button" onClick={() => setSignupPlan('Free')} style={{ ...s.ctaPrimary, border: 'none', cursor: 'pointer' }}>Start free <i className="fas fa-arrow-right" style={{ marginLeft: 8, fontSize: 12 }}></i></button>
                        <a href="#download" style={s.ctaGhost} onClick={(e) => { e.preventDefault(); navigateToSection('download'); }}><i className="fas fa-download" style={{ marginRight: 8 }}></i>Download desktop app</a>
                    </div>
                </div>

                <Reveal delay={100}>
                    <div style={s.heroShotFrame}>
                        <div style={s.heroShotBar}><span style={s.heroShotDot}></span><span style={{ ...s.heroShotDot, background: '#e0b04c' }}></span><span style={{ ...s.heroShotDot, background: '#1f7a6c' }}></span></div>
                        <img src="/screenshots/dashboard.png" alt="MpxHR dashboard" style={s.heroShotImg} />
                    </div>
                </Reveal>

                <div style={s.heroStatRow} className="mkt-hero-stats">
                    <div style={s.heroStat}>
                        <div style={s.heroStatNum}>4</div>
                        <div style={s.heroStatLabel}>Statutory calculations<br />automated — PF · ESI · PT · TDS</div>
                    </div>
                    <div style={s.heroStatDivider}></div>
                    <div style={s.heroStat}>
                        <div style={s.heroStatNum}>0</div>
                        <div style={s.heroStatLabel}>Third-party servers<br />touching your payroll data</div>
                    </div>
                    <div style={s.heroStatDivider}></div>
                    <div style={s.heroStat}>
                        <div style={s.heroStatNum}>&infin;</div>
                        <div style={s.heroStatLabel}>Companies,<br />one login</div>
                    </div>
                </div>
            </section>

            {/* ---- STATS BLOCK ---- */}
            <section style={{ padding: '20px 24px 0' }}>
                <Reveal>
                    <div style={s.statsBlock}>
                        <div style={s.statsEyebrow}>MPXHR, BY THE NUMBERS</div>
                        <div style={s.statsGrid}>
                            <div style={s.statsCell}>
                                <div style={s.statsNum}>9</div>
                                <div style={s.statsLabel}>HR modules in one system — payroll to recruitment</div>
                            </div>
                            <div style={s.statsCell}>
                                <div style={s.statsNum}>4</div>
                                <div style={s.statsLabel}>Statutory calculations automated, every run</div>
                            </div>
                            <div style={s.statsCell}>
                                <div style={s.statsNum}>5</div>
                                <div style={s.statsLabel}>Plans, from permanently free to enterprise</div>
                            </div>
                            <div style={s.statsCell}>
                                <div style={s.statsNum}>0</div>
                                <div style={s.statsLabel}>Third-party servers that ever see your payroll data</div>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ---- FEATURES ---- */}
            <section id="features" style={s.section}>
                <Reveal>
                    <div style={s.sectionHead}>
                        <div style={s.eyebrow}>EVERYTHING INCLUDED</div>
                        <h2 style={s.h2}>One system, every payroll workflow</h2>
                        <p style={s.sectionSub}>Not a payroll calculator bolted onto a spreadsheet — a complete HR system built around how Indian statutory compliance actually works.</p>
                    </div>
                </Reveal>
                <div style={s.featureGrid}>
                    {FEATURES.map((f, i) => (
                        <Reveal key={f.title} delay={i * 80}>
                            <div style={s.featureCard} className="mkt-feature-card">
                                <div style={s.featureIcon}><i className={`fas ${f.icon}`}></i></div>
                                <div style={s.featureTitle}>{f.title}</div>
                                <div style={s.featureDesc}>{f.desc}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ---- PRODUCT SHOWCASE ---- */}
            <section id="showcase" style={{ ...s.section, background: '#f6f8f7' }}>
                <Reveal>
                    <div style={s.sectionHead}>
                        <div style={s.eyebrow}>THE REAL APPLICATION</div>
                        <h2 style={s.h2}>See it before you sign up</h2>
                        <p style={s.sectionSub}>Every screenshot below is the actual product — nothing staged for a brochure.</p>
                    </div>
                </Reveal>
                <div style={s.showcaseStack}>
                    {SHOWCASE.map((item, i) => (
                        <Reveal key={item.label} delay={i * 100}>
                            <div style={{ ...s.showcaseRow, flexDirection: i % 2 === 1 ? 'row-reverse' : 'row' }} className="mkt-showcase-row">
                                <div style={s.showcaseImgWrap}>
                                    <img src={item.img} alt={item.label} style={s.showcaseImg} />
                                </div>
                                <div style={s.showcaseText}>
                                    <div style={s.showcaseLabel}>{item.label}</div>
                                    <p style={s.showcaseDesc}>{item.desc}</p>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ---- DESKTOP DOWNLOAD ---- */}
            <section id="download" style={s.section}>
                <Reveal>
                    <div style={s.downloadCard}>
                        <div style={s.downloadLeft}>
                            <div style={s.eyebrow}>ALSO AVAILABLE FOR WINDOWS</div>
                            <h2 style={{ ...s.h2, marginBottom: 10 }}>A real desktop app, not just a browser tab</h2>
                            <p style={{ ...s.sectionSub, margin: '0 0 22px', maxWidth: 480 }}>The same application in its own window — a taskbar shortcut, no browser chrome, launches straight into your workspace.</p>
                            <a href={DESKTOP_DOWNLOAD_URL} style={s.ctaPrimary} download>
                                <i className="fas fa-download" style={{ marginRight: 9 }}></i>Download for Windows
                            </a>
                            <div style={s.downloadMeta}>Windows 10/11 · 64-bit installer</div>
                        </div>
                        <div style={s.downloadRight}>
                            <i className="fas fa-desktop" style={s.downloadIcon}></i>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ---- PRICING — one panel: prices, caps, and the full feature checklist together,
                 not split across a teaser card here and a separate comparison table elsewhere. ---- */}
            <section id="pricing" style={{ ...s.section, background: '#f6f8f7' }}>
                <Reveal>
                    <div style={s.sectionHead}>
                        <div style={s.eyebrow}>PRICING</div>
                        <h2 style={s.h2}>Free to start. Priced to actually scale with you.</h2>
                        <p style={s.sectionSub}>Every real competitor gets more expensive per employee as you grow. We do the opposite.</p>
                        <div style={s.billingToggle}>
                            <span style={!billingAnnual ? s.billingLabelActive : s.billingLabel}>Monthly</span>
                            <button
                                type="button"
                                onClick={() => setBillingAnnual((v) => !v)}
                                style={{ ...s.toggleTrack, ...(billingAnnual ? s.toggleTrackOn : {}) }}
                                aria-label="Toggle annual billing"
                            >
                                <span style={{ ...s.toggleThumb, ...(billingAnnual ? s.toggleThumbOn : {}) }} />
                            </button>
                            <span style={billingAnnual ? s.billingLabelActive : s.billingLabel}>Annual</span>
                            <span style={s.savePill}>2 months free</span>
                        </div>
                    </div>
                </Reveal>
                <Reveal delay={100}>
                    <div style={s.panelScroll}>
                        <div style={s.panel}>
                            {PLANS.map((p, i) => {
                                const displayPrice = p.price === null ? null : billingAnnual ? Math.round(p.price * 10 / 12) : p.price;
                                return (
                                    <div key={p.name} style={{ ...s.panelCol, ...(p.highlight ? s.panelColHi : {}) }}>
                                        {p.highlight && <div style={s.panelBadge}>MOST POPULAR</div>}
                                        <div style={s.panelName}>{p.name}</div>
                                        <div style={s.panelPrice}>
                                            {displayPrice === null ? 'Custom' : <>₹{displayPrice.toLocaleString('en-IN')}<span style={s.panelPeriod}>/mo</span></>}
                                        </div>
                                        <div style={s.panelCaption}>
                                            {displayPrice === null ? 'Talk to us' : displayPrice === 0 ? 'forever' : billingAnnual ? 'billed annually' : 'per organization'}
                                        </div>
                                        <div style={s.panelIncludes}>{p.employees ? `Includes ${p.employees} employees` : 'Unlimited employees'}</div>

                                        {p.price === null ? (
                                            <button type="button" style={s.panelCta}>{p.cta}</button>
                                        ) : (
                                            <button type="button" style={{ ...s.panelCta, ...(p.highlight ? s.panelCtaHi : {}) }} onClick={() => setSignupPlan(p.name)}>
                                                {p.cta}
                                            </button>
                                        )}

                                        <div style={s.panelFeatureHead}>{i === 0 ? 'Essential features' : `Includes everything in ${PLANS[i - 1].name} plus`}</div>
                                        <ul style={s.panelFeatureList}>
                                            {p.features.map((f) => (
                                                <li key={f} style={s.panelFeatureItem}><i className="fas fa-check" style={s.panelCheck}></i>{f}</li>
                                            ))}
                                        </ul>

                                        <div style={s.panelSupport}>{SUPPORT_LABELS[i]} support</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ---- FAQ — commented out, not deleted, on request. To restore, uncomment. ----
            <section id="faq" style={s.section}>
                <Reveal>
                    <div style={s.sectionHead}>
                        <div style={s.eyebrow}>QUESTIONS</div>
                        <h2 style={s.h2}>Before you get started</h2>
                    </div>
                </Reveal>
                <div style={s.faqGrid}>
                    {FAQS.map(([q, a], i) => (
                        <Reveal key={q} delay={i * 90}>
                            <div style={s.faqCard}>
                                <div style={s.faqQ}>{q}</div>
                                <div style={s.faqA}>{a}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>
            ---- */}

            {/* ---- DOCS / HELP CENTER — commented out, not deleted, on request. Footer's
                 "Help Center" link and the nav's "Docs" link are commented out alongside it
                 below, since both point at #docs and would otherwise silently do nothing. ----
            <section id="docs" style={{ ...s.section, background: '#f6f8f7' }}>
                <DocsView initialChapter={docsChapter} />
            </section>
            ---- */}

            {/* ---- FINAL CTA — commented out, not deleted, on request. ----
            <section style={s.finalCta}>
                <Reveal>
                    <h2 style={s.finalH2}>Run your first payroll in minutes.</h2>
                    <div style={s.heroCtas}>
                        <button type="button" onClick={() => setSignupPlan('Free')} style={{ ...s.ctaPrimaryLight, border: 'none', cursor: 'pointer' }}>Start free <i className="fas fa-arrow-right" style={{ marginLeft: 8, fontSize: 12 }}></i></button>
                        <a href={WEB_APP_URL} style={s.ctaGhostOnDark}>Sign in</a>
                    </div>
                </Reveal>
            </section>
            ---- */}

            {/* ---- FOOTER ---- */}
            <footer style={s.footer}>
                <div style={s.footerGrid}>
                    <div>
                        <div style={s.brand}><i className="fas fa-cube" style={{ marginRight: 9, color: '#5cc9b8' }}></i>MpxHR</div>
                        <p style={s.footerTag}>Payroll &amp; HR software for Indian businesses — self-hosted, statutory-compliant, honestly priced.</p>
                    </div>
                    <div>
                        <div style={s.footerHead}>Product</div>
                        <a href={WEB_APP_URL} style={s.footerLink}>Sign in</a>
                        <a href="#download" style={s.footerLink} onClick={(e) => { e.preventDefault(); navigateToSection('download'); }}>Desktop app</a>
                    </div>
                    <div>
                        <div style={s.footerHead}>Resources</div>
                        <a href="#pricing" style={s.footerLink} onClick={(e) => { e.preventDefault(); navigateToSection('pricing'); }}>Pricing</a>
                    </div>
                </div>
                <div style={s.footerBottom}>
                    © {new Date().getFullYear()} MpxHR. Not affiliated with or endorsed by Relyon Softech Ltd.
                    <button type="button" onClick={openAdmin} style={s.footerAdminLink}>Partner / License Admin</button>
                </div>
            </footer>

            {signupPlan && <SignupModal planName={signupPlan} onClose={() => setSignupPlan(null)} />}
        </div>
    );
}

const CSS = `
  @media (max-width: 880px) {
    .mkt-navlinks {
      /* !important: this element also carries an inline display:flex (its desktop default),
         which otherwise always wins over a plain class selector regardless of media query —
         that mismatch was silently leaving the mobile menu visibly "open" at all times. */
      display: none !important; position: absolute; top: calc(100% + 8px); left: 0; right: 0;
      flex-direction: column; gap: 2px; background: #fff; border-radius: 20px;
      border: 1px solid rgba(18,22,26,0.06); box-shadow: 0 1px 2px rgba(18,22,26,0.04), 0 18px 40px -20px rgba(18,22,26,0.35);
      padding: 12px 24px 16px; z-index: 40;
    }
    .mkt-navlinks.mkt-open { display: flex !important; }
    .mkt-navlinks a { padding: 10px 0; border-bottom: 1px solid #f2f4f3; }
    .mkt-navctas { display: none !important; }
    .mkt-burger { display: flex !important; align-items: center; justify-content: center; }
    .mkt-showcase-row { flex-direction: column !important; }
  }
  @media (min-width: 881px) {
    .mkt-burger { display: none !important; }
  }
`;

const s = {
    page: { fontFamily: '"Segoe UI", -apple-system, Arial, sans-serif', color: '#12161a', background: '#fff', overflowX: 'hidden' },

    nav: { position: 'sticky', top: 14, zIndex: 50, padding: '0 16px' },
    navInner: {
        maxWidth: 1180, margin: '0 auto', padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 28,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 999, border: '1px solid rgba(18,22,26,0.06)',
        boxShadow: '0 1px 2px rgba(18,22,26,0.04), 0 18px 40px -20px rgba(18,22,26,0.25)',
    },
    brand: { fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center' },
    navLinks: { display: 'flex', gap: 22, flex: 1 },
    navLinksOpen: {},
    navLink: { fontSize: 13.5, fontWeight: 600, color: '#454c53', textDecoration: 'none' },
    navCtas: { display: 'flex', alignItems: 'center', gap: 14 },
    navCta: { fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #1f7a6c, #14544a)', padding: '9px 18px', borderRadius: 999, textDecoration: 'none' },
    burger: { display: 'none', marginLeft: 'auto', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#12161a' },

    hero: {
        position: 'relative', padding: '76px 24px 0',
        background: 'radial-gradient(ellipse 70% 60% at 50% 0%, #fdf0dd 0%, #fbf7f1 55%, #fff 100%)',
        overflow: 'hidden',
    },
    heroCenter: { position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', textAlign: 'center' },
    heroEyebrow: { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.16em', color: '#1f7a6c', marginBottom: 18 },
    heroH1: { fontSize: 'clamp(32px, 4.6vw, 52px)', fontWeight: 800, lineHeight: 1.14, letterSpacing: '-0.02em', color: '#14181c', margin: '0 0 20px' },
    heroEmphasis: { fontStyle: 'italic', color: '#1f7a6c', fontWeight: 800 },
    heroSub: { fontSize: 16.5, lineHeight: 1.65, color: '#5b6570', maxWidth: 560, margin: '0 auto 32px' },
    heroCtas: { display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
    heroStatRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, margin: '48px auto 0', flexWrap: 'wrap', maxWidth: 780 },
    heroStat: { minWidth: 110, textAlign: 'center' },
    heroStatNum: { fontSize: 26, fontWeight: 800, color: '#14181c', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' },
    heroStatLabel: { fontSize: 11.5, lineHeight: 1.45, color: '#8b939b', marginTop: 3 },
    heroStatDivider: { width: 1, height: 34, background: '#e6dfd2' },

    heroShotFrame: {
        maxWidth: 1040, margin: '52px auto 0', borderRadius: 14, overflow: 'hidden',
        border: '1px solid #eceeec', boxShadow: '0 50px 100px -40px rgba(20,24,28,0.28)', background: '#fff',
    },
    heroShotBar: { display: 'flex', gap: 6, padding: '10px 12px', background: '#f3f5f6', borderBottom: '1px solid #eceeec' },
    heroShotDot: { width: 9, height: 9, borderRadius: '50%', background: '#e05c5c', display: 'inline-block' },
    heroShotImg: { width: '100%', height: 'auto', display: 'block' },

    statsBlock: {
        maxWidth: 1180, margin: '0 auto', padding: '44px 40px',
        background: 'linear-gradient(120deg, #fbf0dd, #f3ede0)',
        borderRadius: 24, border: '1px solid #ecdfc4',
    },
    statsEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: '#1f7a6c', textAlign: 'center', marginBottom: 30 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 28 },
    statsCell: { textAlign: 'center' },
    statsNum: { fontSize: 44, fontWeight: 800, color: '#14181c', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' },
    statsLabel: { fontSize: 12.5, color: '#6b6558', lineHeight: 1.5, marginTop: 6, maxWidth: 190, marginLeft: 'auto', marginRight: 'auto' },

    ctaPrimary: { display: 'inline-flex', alignItems: 'center', fontSize: 14.5, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #1f7a6c, #14544a)', padding: '13px 26px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 8px 22px -8px rgba(31,122,108,0.6)' },
    ctaPrimaryLight: { display: 'inline-flex', alignItems: 'center', fontSize: 14.5, fontWeight: 700, color: '#0c1210', background: '#fff', padding: '13px 26px', borderRadius: 999, textDecoration: 'none' },
    ctaGhost: { display: 'inline-flex', alignItems: 'center', fontSize: 14.5, fontWeight: 700, color: '#14181c', border: '1px solid #d7dde1', padding: '13px 26px', borderRadius: 999, textDecoration: 'none', background: '#fff' },
    ctaGhostOnDark: { display: 'inline-flex', alignItems: 'center', fontSize: 14.5, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '13px 26px', borderRadius: 999, textDecoration: 'none' },
    ctaGhostDark: { fontSize: 13.5, fontWeight: 700, color: '#0f4a41', textDecoration: 'none' },

    section: { padding: '92px 24px', maxWidth: 1180, margin: '0 auto' },
    sectionHead: { textAlign: 'center', maxWidth: 620, margin: '0 auto 52px' },
    eyebrow: { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.14em', color: '#1f7a6c', marginBottom: 12 },
    h2: { fontSize: 'clamp(26px, 3.4vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 14px', color: '#12161a' },
    sectionSub: { fontSize: 15, lineHeight: 1.6, color: '#5b6570', margin: 0 },

    featureGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 },
    featureCard: { background: '#fff', border: '1px solid #eceeec', borderRadius: 16, padding: '28px 24px', transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease' },
    featureIcon: { width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #1f7a6c, #14544a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 18 },
    featureTitle: { fontSize: 16.5, fontWeight: 800, marginBottom: 8, color: '#14181c' },
    featureDesc: { fontSize: 13.5, lineHeight: 1.6, color: '#5b6570' },

    showcaseStack: { display: 'flex', flexDirection: 'column', gap: 70 },
    showcaseRow: { display: 'flex', alignItems: 'center', gap: 50 },
    showcaseImgWrap: { flex: '1 1 56%', minWidth: 0 },
    showcaseImg: { width: '100%', height: 'auto', display: 'block', borderRadius: 12, border: '1px solid #eceeec', boxShadow: '0 30px 60px -30px rgba(20,24,28,0.25)' },
    showcaseText: { flex: '1 1 30%', minWidth: 240 },
    showcaseLabel: { fontSize: 20, fontWeight: 800, color: '#14181c', marginBottom: 12 },
    showcaseDesc: { fontSize: 14, lineHeight: 1.7, color: '#5b6570' },

    downloadCard: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40,
        background: 'linear-gradient(120deg, #fbf0dd, #f3ede0)',
        borderRadius: 24, padding: '54px 56px', flexWrap: 'wrap', border: '1px solid #ecdfc4',
    },
    downloadLeft: { flex: '1 1 380px' },
    downloadRight: { flex: '0 0 auto' },
    downloadIcon: { fontSize: 92, color: 'rgba(31,122,108,0.25)' },
    downloadMeta: { fontSize: 12, color: '#8b8065', marginTop: 12 },

    billingToggle: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 30 },
    billingLabel: { fontSize: 13, color: '#8b939b', fontWeight: 600 },
    billingLabelActive: { fontSize: 13, color: '#12161a', fontWeight: 700 },
    toggleTrack: { width: 44, height: 24, borderRadius: 999, background: '#d7dde1', border: 'none', position: 'relative', cursor: 'pointer', padding: 0, transition: 'background 0.15s ease' },
    toggleTrackOn: { background: '#1f7a6c' },
    toggleThumb: { position: 'absolute', top: 3, left: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'transform 0.15s ease' },
    toggleThumbOn: { transform: 'translateX(20px)' },
    savePill: { fontSize: 10.5, fontWeight: 800, color: '#0f4a41', background: '#dbe9e6', padding: '3px 9px', borderRadius: 999, letterSpacing: '0.02em' },

    panelScroll: { overflowX: 'auto', paddingBottom: 4 },
    panel: {
        display: 'grid', gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))', gap: 0,
        maxWidth: 1180, margin: '0 auto', background: '#fff', borderRadius: 18, border: '1px solid #e3e7ea',
        boxShadow: '0 1px 2px rgba(18,22,26,0.03), 0 30px 60px -34px rgba(18,22,26,0.14)', overflow: 'hidden',
    },
    panelCol: { padding: '26px 20px', borderRight: '1px solid #eceeec', position: 'relative', display: 'flex', flexDirection: 'column' },
    panelColHi: { boxShadow: 'inset 0 0 0 2px #1f7a6c, 0 10px 30px -14px rgba(31,122,108,0.35)', zIndex: 1 },
    panelBadge: {
        position: 'absolute', top: -1, left: -2, right: -2, textAlign: 'center', background: 'linear-gradient(135deg, #1f7a6c, #14544a)',
        color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', padding: '6px 0', borderRadius: '12px 12px 0 0',
    },
    panelName: { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', color: '#5b6570', textTransform: 'uppercase', marginTop: 14 },
    panelPrice: { fontSize: 30, fontWeight: 800, color: '#12161a', letterSpacing: '-0.01em', marginTop: 10 },
    panelPeriod: { fontSize: 13, fontWeight: 600, color: '#8b939b', marginLeft: 2 },
    panelCaption: { fontSize: 11.5, color: '#8b939b', marginTop: 2 },
    panelIncludes: { fontSize: 12, fontWeight: 700, color: '#454c53', marginTop: 12, paddingTop: 12, borderTop: '1px solid #eef1f3' },
    panelCta: {
        marginTop: 16, padding: '10px 14px', borderRadius: 999, border: '1px solid #d7dde1',
        background: '#fff', color: '#12161a', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
    },
    panelCtaHi: { background: 'linear-gradient(135deg, #1f7a6c, #14544a)', color: '#fff', border: 'none', boxShadow: '0 4px 12px -4px rgba(31,122,108,0.5)' },
    panelFeatureHead: { fontSize: 11.5, fontWeight: 700, color: '#12161a', marginTop: 22, marginBottom: 10 },
    panelFeatureList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 },
    panelFeatureItem: { fontSize: 12, color: '#3c434a', display: 'flex', alignItems: 'flex-start', lineHeight: 1.4 },
    panelCheck: { color: '#1f7a6c', fontSize: 10, marginRight: 8, marginTop: 3, flexShrink: 0 },
    panelSupport: { fontSize: 11, color: '#8b939b', borderTop: '1px dashed #eef1f3', paddingTop: 12, marginTop: 16 },

    faqGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, maxWidth: 900, margin: '0 auto' },
    faqCard: { background: '#f6f8f7', borderRadius: 14, padding: '22px 24px' },
    faqQ: { fontSize: 14.5, fontWeight: 700, marginBottom: 8, color: '#12161a' },
    faqA: { fontSize: 13.5, lineHeight: 1.6, color: '#5b6570' },

    finalCta: { textAlign: 'center', padding: '100px 24px', background: 'linear-gradient(135deg, #14544a, #0c1210)' },
    finalH2: { fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 30px' },

    footer: { background: '#0c1210', padding: '56px 24px 28px' },
    footerGrid: { maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 40 },
    footerTag: { fontSize: 13, lineHeight: 1.6, color: '#7d8983', maxWidth: 320, marginTop: 12 },
    footerHead: { fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', color: '#5cc9b8', marginBottom: 14, textTransform: 'uppercase' },
    footerLink: { display: 'block', fontSize: 13, color: '#a8b0ac', textDecoration: 'none', marginBottom: 10 },
    footerBottom: { maxWidth: 1180, margin: '48px auto 0', paddingTop: 24, borderTop: '1px solid #1c2420', fontSize: 12, color: '#5c6660', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
    footerAdminLink: { background: 'none', border: 'none', color: '#5c6660', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textDecorationColor: '#3a423d' },
};

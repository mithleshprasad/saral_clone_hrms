import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppStateContext';
import { useWindowManager } from '../../context/WindowManagerContext';
import { MENUS, TOP_LINKS, toolbarForPath } from './menuConfig';
import FormModal from './FormModal';

function financialYearOptions() {
    const cy = new Date().getFullYear();
    const years = [];
    for (let y = cy + 1; y >= cy - 5; y--) years.push(`${y}-${y + 1}`);
    return years;
}

const QUICK_START_STEPS = [
    ['Pick a company', 'Use the Company selector at the top right to choose which company\'s data you\'re working with — every screen filters to it automatically.'],
    ['Set up masters', 'Under Initial Settings, add your Departments, Designations, Branches, Salary Heads and Shifts before entering employees.'],
    ['Add employees', 'Master → Employee Details, or Import/Export → Import Employees to bring in a whole list from Excel at once.'],
    ['Run payroll', 'Salary Transactions → Net Pay to generate pay for the period, then Pay Slip to view or download each one as a PDF.'],
    ['Pull reports', 'Report → Statutory Reports for the standard set, or Report Writer to build a custom one.'],
];

// Underlines a label's mnemonic character — the first occurrence of `char` (case-insensitive)
// if given, otherwise the label's first alphabetic character.
function Mnemonic({ label, char }) {
    const idx = char ? label.toUpperCase().indexOf(char.toUpperCase()) : label.search(/[a-z]/i);
    // Wrapped in a single <span> — the parent buttons/menu items are flex containers with a
    // `gap`, which would otherwise insert extra spacing between the fragment's separate
    // text/underline parts as if they were independent flex items.
    if (idx === -1) return <span>{label}</span>;
    return <span>{label.slice(0, idx)}<u>{label[idx]}</u>{label.slice(idx + 1)}</span>;
}

export default function MenuBar() {
    const { user, logout } = useAuth();
    const { companies, companyId, setCompanyId, financialYear, setFinancialYear, month, setMonth } = useAppState();
    const { windows, activeId, openWindow } = useWindowManager();
    const [openMenu, setOpenMenu] = useState(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [showAbout, setShowAbout] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [showQuickStart, setShowQuickStart] = useState(false);
    const barRef = useRef(null);
    const isSuperAdmin = user?.role === 'Super Admin';

    const activeCompany = companies.find((c) => String(c.id) === String(companyId));
    const activeWindow = windows.find((w) => w.id === activeId);
    const toolbarShortcuts = toolbarForPath(activeWindow?.path);
    const visibleMenus = MENUS.filter((menu) => menu.items.some((i) => !i.superAdminOnly || isSuperAdmin));

    useEffect(() => {
        function onClickOutside(e) {
            if (barRef.current && !barRef.current.contains(e.target)) { setOpenMenu(null); setFocusedIndex(-1); }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    function handleItemClick(item) {
        setOpenMenu(null);
        setFocusedIndex(-1);
        if (item.action === 'logout') return logout();
        if (item.action === 'about') return setShowAbout(true);
        if (item.action === 'contact') return setShowContact(true);
        if (item.action === 'quickstart') return setShowQuickStart(true);
        if (item.href) return window.open(item.href, '_blank');
        if (item.to) openWindow({ path: item.to, title: item.label, icon: item.icon });
    }

    // Alt+letter opens/switches a top-level menu from anywhere (real mnemonic behavior fires
    // even while a text field elsewhere has focus). Once a menu is open, arrow keys move
    // between/within menus, Enter activates the focused item, a bare letter jumps straight to
    // (and activates) the first item starting with it, Escape closes.
    useEffect(() => {
        function onKeyDown(e) {
            if (e.altKey && !e.ctrlKey && !e.metaKey && /^[a-z]$/i.test(e.key)) {
                const menu = visibleMenus.find((m) => m.mnemonic === e.key.toUpperCase());
                if (menu) {
                    e.preventDefault();
                    setOpenMenu((cur) => (cur === menu.label ? null : menu.label));
                    setFocusedIndex(-1);
                }
                return;
            }

            if (!openMenu) return;
            const menu = visibleMenus.find((m) => m.label === openMenu);
            if (!menu) return;
            const items = menu.items.filter((i) => i.type !== 'sep' && (!i.superAdminOnly || isSuperAdmin));

            if (e.key === 'Escape') {
                e.preventDefault();
                setOpenMenu(null);
                setFocusedIndex(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedIndex((i) => (i + 1) % items.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const idx = visibleMenus.findIndex((m) => m.label === openMenu);
                const dir = e.key === 'ArrowRight' ? 1 : -1;
                setOpenMenu(visibleMenus[(idx + dir + visibleMenus.length) % visibleMenus.length].label);
                setFocusedIndex(-1);
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (focusedIndex >= 0 && items[focusedIndex]) {
                    e.preventDefault();
                    handleItemClick(items[focusedIndex]);
                }
            } else if (/^[a-z]$/i.test(e.key)) {
                const matchIdx = items.findIndex((i) => i.label.toUpperCase().startsWith(e.key.toUpperCase()));
                if (matchIdx !== -1) {
                    e.preventDefault();
                    handleItemClick(items[matchIdx]);
                }
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openMenu, focusedIndex, isSuperAdmin]);

    return (
        <div className="menubar-shell">
            <div className="menubar-brand">
                <i className="fas fa-file-invoice-dollar"></i>
                <span>MpxHR : {activeCompany?.name || 'No Company Selected'} : FY {financialYear}</span>

                <div className="spacer"></div>

                <div className="menubar-context">
                    <span>Company</span>
                    <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                        {companies.length === 0 && <option value="">No companies</option>}
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <span>FY</span>
                    <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)}>
                        {financialYearOptions().map((fy) => <option key={fy} value={fy}>{fy}</option>)}
                    </select>
                    <span>Month</span>
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'short' })}</option>
                        ))}
                    </select>
                    <span>{user?.username} ({user?.role})</span>
                    <button className="menubar-logout" onClick={logout}>Logout</button>
                </div>
            </div>

            <div className="menubar" ref={barRef}>
                {visibleMenus.map((menu) => {
                    const visibleItems = menu.items.filter((i) => !i.superAdminOnly || isSuperAdmin);
                    let itemIndex = -1; // tracks position within the sep-filtered list the keydown handler uses
                    return (
                        <div key={menu.label} style={{ position: 'relative' }}>
                            <div
                                className={`menubar-item ${openMenu === menu.label ? 'open' : ''}`}
                                onClick={() => { setOpenMenu(openMenu === menu.label ? null : menu.label); setFocusedIndex(-1); }}
                            >
                                <Mnemonic label={menu.label} char={menu.mnemonic} />
                            </div>
                            {openMenu === menu.label && (
                                <div className="menubar-dropdown">
                                    {visibleItems.map((item, i) => {
                                        if (item.type === 'sep') return <div className="menu-sep" key={i}></div>;
                                        itemIndex += 1;
                                        const focused = itemIndex === focusedIndex;
                                        return (
                                            <button
                                                key={item.label}
                                                className={focused ? 'focused' : ''}
                                                onClick={() => handleItemClick(item)}
                                                onMouseEnter={() => setFocusedIndex(itemIndex)}
                                            >
                                                <i className={`fas ${item.icon}`} style={{ width: 14 }}></i>
                                                <Mnemonic label={item.label} />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                <div style={{ flex: 1 }}></div>

                {TOP_LINKS.map((item) => (
                    <div key={item.label} className="menubar-item" onClick={() => handleItemClick(item)}>
                        <i className={`fas ${item.icon}`} style={{ marginRight: 5 }}></i>{item.label}
                    </div>
                ))}
            </div>

            <div className="win-toolbar">
                {toolbarShortcuts.map((item) => (
                    <button
                        key={item.to}
                        className={`win-toolbar-btn ${activeWindow?.path === item.to ? 'active' : ''}`}
                        onClick={() => openWindow({ path: item.to, title: item.label, icon: item.icon })}
                    >
                        <i className={`fas ${item.icon}`}></i>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>

            {showAbout && (
                <FormModal title="About" icon="fa-circle-info" onClose={() => setShowAbout(false)} width={420}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <i className="fas fa-file-invoice-dollar" style={{ fontSize: 36, color: 'var(--primary)' }}></i>
                        <h3 style={{ margin: '10px 0 2px' }}>MpxHR</h3>
                        <p className="text-muted" style={{ margin: 0 }}>Cloud payroll &amp; HR management</p>
                        <p className="text-muted" style={{ fontSize: 11, marginTop: 12 }}>
                            An independent, open-source-style clone built for learning and internal use.
                            Not affiliated with or endorsed by Relyon Softech Ltd.
                        </p>
                    </div>
                    <div className="win-btn-bar" style={{ justifyContent: 'center', marginTop: 8 }}>
                        <button className="win-btn outline" onClick={() => setShowAbout(false)}>Close</button>
                    </div>
                </FormModal>
            )}

            {showContact && (
                <FormModal title="Contact Us" icon="fa-headset" onClose={() => setShowContact(false)} width={420}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <i className="fas fa-headset" style={{ fontSize: 32, color: 'var(--primary)' }}></i>
                        <p style={{ marginTop: 12 }}>This is an internal/demo payroll system.</p>
                        <p className="text-muted" style={{ fontSize: 11.5 }}>
                            For access issues or data questions, please reach out to your system administrator
                            or the person who set up this instance for you.
                        </p>
                    </div>
                    <div className="win-btn-bar" style={{ justifyContent: 'center', marginTop: 8 }}>
                        <button className="win-btn outline" onClick={() => setShowContact(false)}>Close</button>
                    </div>
                </FormModal>
            )}

            {showQuickStart && (
                <FormModal title="Quick Start" icon="fa-rocket" onClose={() => setShowQuickStart(false)} width={520}>
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                        {QUICK_START_STEPS.map(([title, body]) => (
                            <li key={title} style={{ marginBottom: 10 }}>
                                <strong>{title}</strong>
                                <div className="text-muted" style={{ fontSize: 11.5 }}>{body}</div>
                            </li>
                        ))}
                    </ol>
                    <div className="win-btn-bar" style={{ justifyContent: 'center', marginTop: 8 }}>
                        <button className="win-btn outline" onClick={() => setShowQuickStart(false)}>Close</button>
                    </div>
                </FormModal>
            )}
        </div>
    );
}

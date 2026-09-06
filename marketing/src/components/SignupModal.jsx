import { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';

const LICENSE_API_URL = import.meta.env.VITE_LICENSE_API_URL || 'http://localhost:4001/api';
const WEB_APP_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:5173';

function buildUpiLink(upiId, payeeName, amount) {
    if (!upiId) return null;
    const params = new URLSearchParams({ pa: upiId, cu: 'INR' });
    if (payeeName) params.set('pn', payeeName);
    if (amount) params.set('am', amount);
    return `upi://pay?${params.toString()}`;
}

function PaidConfirmation({ result, plan }) {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [upiId, setUpiId] = useState(null);

    useEffect(() => {
        axios.get(`${LICENSE_API_URL}/payment-settings/public`).then(({ data }) => {
            setUpiId(data.upi_id || null);
            const link = buildUpiLink(data.upi_id, data.payee_name || 'MpxHR', plan.price);
            if (link) QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQrDataUrl);
        }).catch(() => {});
    }, [plan.price]);

    return (
        <div style={s.body}>
            <div style={s.iconCircle}><i className="fas fa-clock" style={{ color: '#b5790f' }}></i></div>
            <h3 style={s.h3}>Almost there — pay to activate</h3>
            <p style={s.p}>Your license key: <code style={s.code}>{result.licenseKey}</code></p>
            <p style={s.p}>Pay <strong>₹{plan.price.toLocaleString('en-IN')}</strong> to the UPI ID below, then we verify and activate your account — usually within a few hours.</p>

            {qrDataUrl ? (
                <img src={qrDataUrl} alt="UPI payment QR code" width={180} height={180} style={{ margin: '0 auto 14px', display: 'block' }} />
            ) : (
                <div style={{ ...s.qrPlaceholder }}>{upiId === null ? 'Loading payment details…' : 'Payment not configured yet — contact us to complete signup.'}</div>
            )}
            {upiId && <p style={{ ...s.p, fontSize: 13, color: '#5b6570' }}>UPI ID: <strong>{upiId}</strong></p>}

            <div style={s.noteBox}>
                <strong>Keep your license key</strong> — mention it in the payment note if you can, or just reply to your confirmation email with it. That's how we match your payment to your account.
            </div>
        </div>
    );
}

function FreeConfirmation({ result }) {
    return (
        <div style={s.body}>
            <div style={{ ...s.iconCircle, background: '#dbe9e6' }}><i className="fas fa-check" style={{ color: '#1f7a6c' }}></i></div>
            <h3 style={s.h3}>You're set — no payment needed</h3>
            <p style={s.p}>Your license key: <code style={s.code}>{result.licenseKey}</code></p>
            <p style={s.p}>Set up your own installation (see the <span style={{ fontWeight: 700 }}>Getting Around</span> chapter in the Docs below) and enter this key as <code style={s.code}>LICENSE_KEY</code> — then sign in.</p>
            <a href={WEB_APP_URL} style={s.ctaPrimary}>Go to sign in <i className="fas fa-arrow-right" style={{ marginLeft: 8, fontSize: 12 }}></i></a>
        </div>
    );
}

export default function SignupModal({ planName, onClose }) {
    const [plan, setPlan] = useState(null);
    const [form, setForm] = useState({ client_name: '', contact_email: '', contact_phone: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        import('../data/plans').then(({ PLANS }) => setPlan(PLANS.find((p) => p.name === planName) || PLANS[0]));
    }, [planName]);

    async function submit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post(`${LICENSE_API_URL}/signup`, { ...form, plan_name: planName });
            setResult(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong — please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={s.backdrop} onClick={onClose}>
            <div style={s.modal} onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={onClose} style={s.closeBtn} aria-label="Close"><i className="fas fa-xmark"></i></button>

                {!result && plan && (
                    <div style={s.body}>
                        <div style={s.eyebrow}>SIGN UP — {plan.name.toUpperCase()}</div>
                        <h3 style={s.h3}>{plan.price === 0 ? 'Start free, no card needed' : `Get started with ${plan.name}`}</h3>
                        <p style={s.p}>{plan.price === 0 ? 'Up to 10 employees, one company, forever.' : `₹${plan.price?.toLocaleString('en-IN')}/mo, up to ${plan.employees} employees.`}</p>

                        {error && <p style={s.errorText}>{error}</p>}

                        <form onSubmit={submit}>
                            <div style={s.field}>
                                <label style={s.label}>Company name</label>
                                <input style={s.input} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required autoFocus />
                            </div>
                            <div style={s.field}>
                                <label style={s.label}>Work email</label>
                                <input style={s.input} type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} required />
                            </div>
                            <div style={s.field}>
                                <label style={s.label}>Phone (optional)</label>
                                <input style={s.input} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                            </div>
                            <button type="submit" style={{ ...s.ctaPrimary, width: '100%', justifyContent: 'center', border: 'none', cursor: 'pointer' }} disabled={loading}>
                                {loading ? 'Creating your account…' : plan.price === 0 ? 'Create free account' : 'Continue to payment'}
                            </button>
                        </form>
                    </div>
                )}

                {result && plan && (plan.price === 0 ? <FreeConfirmation result={result} /> : <PaidConfirmation result={result} plan={plan} />)}
            </div>
        </div>
    );
}

const s = {
    backdrop: { position: 'fixed', inset: 0, background: 'rgba(20,24,28,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
    modal: { position: 'relative', background: '#fff', borderRadius: 20, width: 'min(440px, 100%)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.35)' },
    closeBtn: { position: 'absolute', top: 16, right: 16, background: '#f3f5f6', border: 'none', width: 30, height: 30, borderRadius: '50%', color: '#5b6570', cursor: 'pointer', fontSize: 13 },
    body: { padding: '40px 32px', textAlign: 'center' },
    eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#1f7a6c', marginBottom: 10 },
    h3: { fontSize: 21, fontWeight: 800, color: '#14181c', margin: '0 0 8px' },
    p: { fontSize: 13.5, lineHeight: 1.6, color: '#5b6570', margin: '0 0 18px' },
    field: { textAlign: 'left', marginBottom: 14 },
    label: { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#5b6570', marginBottom: 5 },
    input: { width: '100%', padding: '10px 13px', fontSize: 14, border: '1px solid #d7dde1', borderRadius: 9, fontFamily: 'inherit' },
    errorText: { color: '#b3352f', fontSize: 13, marginBottom: 14 },
    ctaPrimary: { display: 'inline-flex', alignItems: 'center', fontSize: 14.5, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #1f7a6c, #14544a)', padding: '13px 26px', borderRadius: 999, textDecoration: 'none' },
    iconCircle: { width: 44, height: 44, borderRadius: '50%', background: '#fdf6e3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 17 },
    code: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '0.9em', background: '#f3f5f6', border: '1px solid #e3e7ea', borderRadius: 4, padding: '2px 7px', color: '#0f4a41' },
    qrPlaceholder: { fontSize: 12.5, color: '#8b939b', padding: '30px 10px', border: '1px dashed #d7dde1', borderRadius: 10, marginBottom: 14 },
    noteBox: { textAlign: 'left', fontSize: 12, lineHeight: 1.6, color: '#5b6570', background: '#f9faf9', border: '1px solid #eceeec', borderRadius: 10, padding: '12px 14px', marginTop: 6 },
};

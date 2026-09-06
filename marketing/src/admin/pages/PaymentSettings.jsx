import { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import apiClient from '../api/client';

// The QR is never stored — it's generated on the fly from upi_id/payee_name into a UPI
// deep link (the same format any UPI app scans to start a payment). Editing either field
// below regenerates it immediately, which is what makes it "dynamic": there's no image
// asset to re-upload when the vendor's bank/UPI ID changes.
function buildUpiLink(upiId, payeeName) {
    if (!upiId) return null;
    const params = new URLSearchParams({ pa: upiId, cu: 'INR' });
    if (payeeName) params.set('pn', payeeName);
    return `upi://pay?${params.toString()}`;
}

export default function PaymentSettings() {
    const [form, setForm] = useState({ upi_id: '', payee_name: '' });
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const { data } = await apiClient.get('/payment-settings');
        setForm({ upi_id: data.upi_id || '', payee_name: data.payee_name || '' });
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const link = buildUpiLink(form.upi_id, form.payee_name);
        if (!link) { setQrDataUrl(null); return; }
        let cancelled = false;
        QRCode.toDataURL(link, { width: 220, margin: 1 })
            .then((url) => { if (!cancelled) setQrDataUrl(url); })
            .catch(() => { if (!cancelled) setQrDataUrl(null); });
        return () => { cancelled = true; };
    }, [form.upi_id, form.payee_name]);

    async function save(e) {
        e.preventDefault();
        setError('');
        setSaved(false);
        setSaving(true);
        try {
            await apiClient.put('/payment-settings', form);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save payment settings');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <div className="page-header"><h1>Payment Settings</h1></div>
            <p className="text-muted" style={{ marginTop: 0 }}>
                Set the UPI ID clients pay into. The QR code below is generated live from it —
                change the UPI ID and the QR changes with it, nothing to re-upload.
            </p>

            <div className="card" style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <form onSubmit={save} style={{ flex: '1 1 280px', minWidth: 240 }}>
                    {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
                    <div className="form-field" style={{ marginBottom: 10 }}>
                        <label>UPI ID (VPA)</label>
                        <input placeholder="mpxhr@okhdfcbank" value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} />
                    </div>
                    <div className="form-field" style={{ marginBottom: 14 }}>
                        <label>Payee Name (shown to the payer)</label>
                        <input placeholder="MpxHR" value={form.payee_name} onChange={(e) => setForm({ ...form, payee_name: e.target.value })} />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    {saved && <span style={{ marginLeft: 10, color: 'var(--success)', fontSize: 11.5 }}>Saved.</span>}
                </form>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 220, height: 220, border: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {qrDataUrl
                            ? <img src={qrDataUrl} alt="UPI payment QR code" width={210} height={210} />
                            : <span className="text-muted" style={{ fontSize: 11, padding: 10 }}>Enter a UPI ID to preview the QR</span>}
                    </div>
                    <div className="text-muted" style={{ fontSize: 10.5, marginTop: 6 }}>Live preview — this is what clients scan</div>
                </div>
            </div>
        </div>
    );
}

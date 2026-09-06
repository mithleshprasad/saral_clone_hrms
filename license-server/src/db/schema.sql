-- MpxHR License Server — tracks independently-deployed client installations, separate
-- from any client's own database. One row per client installation ("license"); each
-- deployed server/ instance checks in here periodically to confirm it's still allowed
-- to run at full capability.

CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature-gated plan catalog. `features` is a JSON array of feature keys the client
-- server/ instance checks against (e.g. ["payroll","statutory_filing","recruitment",
-- "ess","reports","recruitment_letters"]). `max_companies` caps how many companies that
-- one deployed instance may create — NULL means unlimited.
CREATE TABLE IF NOT EXISTS license_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    max_companies INT DEFAULT NULL,
    max_employees INT DEFAULT NULL,
    monthly_price_inr INT DEFAULT NULL,
    features JSON NOT NULL,
    price_notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(200) DEFAULT NULL,
    license_key VARCHAR(64) NOT NULL UNIQUE,
    plan_id INT NOT NULL,
    -- Vendor-controlled state only. Whether a currently-Active license has actually lapsed
    -- past its expires_at date is computed at validation time, not stored here — that way
    -- "expired" can never drift out of sync with the clock.
    status ENUM('Active', 'Suspended', 'Revoked') NOT NULL DEFAULT 'Active',
    issued_at DATE NOT NULL,
    expires_at DATE NOT NULL,
    last_checkin_at TIMESTAMP NULL DEFAULT NULL,
    last_checkin_ip VARCHAR(64) DEFAULT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES license_plans(id)
);

-- Singleton row (fixed id = 1) holding the vendor's UPI details shown to clients for
-- payment. There's no stored QR image — License Admin renders the QR client-side from
-- upi_id/payee_name, so editing these two fields *is* "changing the QR code".
CREATE TABLE IF NOT EXISTS payment_settings (
    id INT PRIMARY KEY,
    upi_id VARCHAR(100) DEFAULT NULL,
    payee_name VARCHAR(150) DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- One row per payment the vendor has recorded against a license. There's no separate
-- approval step: recording a transaction IS the activation — the vendor confirms money
-- received in their own banking/UPI app first, then logs it here, which atomically
-- extends expires_at and reactivates the license in the same request.
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    license_id INT NOT NULL,
    amount_inr INT NOT NULL,
    reference VARCHAR(120) DEFAULT NULL,
    extended_days INT NOT NULL,
    notes VARCHAR(300) DEFAULT NULL,
    previous_expires_at DATE NOT NULL,
    new_expires_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (license_id) REFERENCES licenses(id)
);

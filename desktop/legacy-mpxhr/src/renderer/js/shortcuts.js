export function initShortcuts() {
    document.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        const activeTag = document.activeElement.tagName;
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag) || document.activeElement.isContentEditable;

        // --- 1. Save (Ctrl + S) ---
        // Allowed even in inputs
        if (isCtrl && e.key.toLowerCase() === 's') {
            e.preventDefault();
            handleSaveShortcut();
            return;
        }

        // --- 2. Escape (Close Modals) ---
        // Allowed even in inputs
        if (e.key === 'Escape') {
            handleEscapeShortcut();
            return;
        }

        // --- Block all other shortcuts if typing in an input ---
        if (isInputFocused && !isCtrl) {
            // Allow standard keys like Delete, Backspace, etc. to work normally in inputs
            return; 
        }
        
        // Block creation/navigation shortcuts if in input (even if Ctrl is pressed, except specific ones)
        if (isInputFocused && isCtrl && ['n', 'e', 'r', 'p'].includes(e.key.toLowerCase())) {
             return; 
        }

        // --- 3. New (Ctrl + N) ---
        if (isCtrl && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            handleNewShortcut();
            return;
        }

        // --- 4. Delete (Delete Key) ---
        if (e.key === 'Delete') {
            handleDeleteShortcut();
            return;
        }

        // --- 5. Edit (Ctrl + E) ---
        if (isCtrl && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            handleEditShortcut();
            return;
        }

        // --- 6. Refresh (Ctrl + R) ---
        if (isCtrl && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            handleRefreshShortcut();
            return;
        }

        // --- 7. Print (Ctrl + P) ---
        if (isCtrl && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            handlePrintShortcut();
            return;
        }

        // --- 8. Navigation (Alt + 1,2,3,4) ---
        if (e.altKey && ['1', '2', '3', '4'].includes(e.key)) {
            e.preventDefault();
            handleNavigationShortcut(e.key);
            return;
        }
    });

    console.log("Global Shortcuts Initialized: Ctrl+S (Save), Ctrl+N (New), Del (Delete), Esc (Close)");
}

function handleSaveShortcut() {
    // 1. Check for Active Modal
    const activeModal = document.querySelector('.erp-modal-overlay.active');
    if (activeModal) {
        // Find a save button
        // Usually .btn-blue or text 'Save'
        const saveBtn = activeModal.querySelector('.btn-blue, button[onclick*="save"], button[onclick*="Save"]');
        if (saveBtn && !saveBtn.disabled) {
            console.log("Shortcut: Triggering Modal Save");
            saveBtn.click();
            return;
        }
    }

    // 2. Check for Bulk Save Button (visible)
    const bulkSaveBtns = document.querySelectorAll('button[id^="btn-bulk-save-"]');
    for (const btn of bulkSaveBtns) {
        if (btn.offsetParent !== null) { // Check visibility
            console.log("Shortcut: Triggering Bulk Save");
            btn.click();
            return;
        }
    }

    // 3. Fallback: Check for generic save button in Toolbar if any
    const toolbarSave = document.querySelector('.erp-toolbar .btn-save, .erp-toolbar button i.fa-save');
    if (toolbarSave && toolbarSave.closest('button')) {
        toolbarSave.closest('button').click();
    }
}

function handleNewShortcut() {
    // Trigger "New" in Toolbar
    // Look for button with fa-plus
    const newBtn = document.querySelector('.erp-toolbar button i.fa-plus');
    if (newBtn && newBtn.closest('button')) {
        console.log("Shortcut: Triggering New Entry");
        newBtn.closest('button').click();
    }
}

function handleDeleteShortcut() {
    // Trigger "Delete" in Toolbar
    // Look for button with fa-trash
    const delBtn = document.querySelector('.erp-toolbar button i.fa-trash');
    if (delBtn && delBtn.closest('button')) {
        console.log("Shortcut: Triggering Delete");
        delBtn.closest('button').click();
    }
}

function handleEscapeShortcut() {
    // Find active modal and close it
    const activeModal = document.querySelector('.erp-modal-overlay.active');
    if (activeModal) {
        // Try to find a close button or remove the active class
        const closeBtn = activeModal.querySelector('.erp-modal-close, button[onclick*="close"], button[onclick*="Close"]');
        if (closeBtn) {
            closeBtn.click();
        } else {
            // Fallback: manually hide
            activeModal.classList.remove('active');
        }
        console.log("Shortcut: Closing Modal");
    }
}

function handleEditShortcut() {
    // Trigger "Edit" in Toolbar
    // Look for button with fa-edit
    const editBtn = document.querySelector('.erp-toolbar button i.fa-edit');
    if (editBtn && editBtn.closest('button')) {
        console.log("Shortcut: Triggering Edit");
        editBtn.closest('button').click();
    }
}

function handleRefreshShortcut() {
    // Reload current page if function exists
    if (window.loadPage && window.currentPage) {
        console.log("Shortcut: Triggering Refresh");
        window.loadPage(window.currentPage);
        if (window.showToast) window.showToast("Refreshed Data", "info");
    }
}

function handlePrintShortcut() {
    // Look for a print button (e.g., in Payslip or Reports)
    const printBtn = document.querySelector('button i.fa-print');
    if (printBtn && printBtn.closest('button')) {
        console.log("Shortcut: Triggering Print");
        printBtn.closest('button').click();
    } else {
        if (window.showToast) window.showToast("No active print action found", "info");
    }
}

function handleNavigationShortcut(key) {
    const tabs = document.querySelectorAll('.ribbon-tab');
    let targetIndex = -1;

    // Map Alt+1 to first tab, etc.
    if (key === '1') targetIndex = 0; // Masters
    if (key === '2') targetIndex = 1; // Attendance
    if (key === '3') targetIndex = 2; // Payroll
    if (key === '4') targetIndex = 3; // Reports

    if (targetIndex >= 0 && tabs[targetIndex]) {
        console.log("Shortcut: Triggering Tab Navigation", targetIndex);
        tabs[targetIndex].click();
    }
}

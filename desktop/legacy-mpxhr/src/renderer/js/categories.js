import { escapeHtml } from './utils.js';

export async function loadCategories() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="erp-container" style="display:flex; flex-direction:column; height:100%; overflow:hidden;">
            <div class="erp-toolbar">
                <button class="erp-btn erp-btn-primary" onclick="openCategoryModal('new')"><i class="fas fa-plus"></i> New</button>
                <button class="erp-btn" onclick="openCategoryModal('edit')"><i class="fas fa-edit"></i> Edit</button>
                <button class="erp-btn" onclick="deleteCategory()"><i class="fas fa-trash"></i> Delete</button>
            </div>
            <div class="erp-grid-container" style="flex:1;">
                <table class="erp-table">
                    <thead>
                        <tr>
                            <th style="width:30px;"></th>
                            <th style="width:60px;">ID</th>
                            <th>Category Name</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody id="cat-grid-body"></tbody>
                </table>
            </div>
        </div>

        <div id="category-modal" class="erp-modal-overlay">
            <div class="erp-modal-window" style="width:420px;">
                <div class="erp-modal-header">
                    <span id="category-modal-title">New Category</span>
                    <span class="erp-modal-close" onclick="closeCategoryModal()">&times;</span>
                </div>
                <div class="erp-modal-body">
                    <input type="hidden" id="cat-id">
                    <div class="form-row"><label class="form-label">Name *</label><input type="text" id="cat-name" class="form-input"></div>
                    <div class="form-row"><label class="form-label">Description</label><input type="text" id="cat-desc" class="form-input"></div>
                </div>
                <div class="erp-modal-footer">
                    <button class="btn-gray" onclick="closeCategoryModal()">Cancel</button>
                    <button class="btn-blue" onclick="saveCategory()">Save</button>
                </div>
            </div>
        </div>
    `;

    let selectedId = null;
    await refreshCategories();

    async function refreshCategories() {
        const cats = await window.electronAPI.getCategories();
        const tbody = document.getElementById('cat-grid-body');
        if (cats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">No categories yet. Click New to add one.</td></tr>';
            return;
        }
        tbody.innerHTML = cats.map(c => `
            <tr class="gw-row ${selectedId === c.id ? 'selected' : ''}" onclick="selectCategoryRow(${c.id})">
                <td><input type="radio" name="cat_select" ${selectedId === c.id ? 'checked' : ''} onclick="event.stopPropagation(); selectCategoryRow(${c.id})"></td>
                <td>${c.id}</td>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.description) || '-'}</td>
            </tr>
        `).join('');
    }

    window.selectCategoryRow = (id) => { selectedId = id; refreshCategories(); };

    window.openCategoryModal = (mode) => {
        if (mode === 'edit') {
            if (!selectedId) { window.showToast('Select a category first', 'info'); return; }
        }
        document.getElementById('category-modal').classList.add('active');
        document.getElementById('category-modal-title').textContent = mode === 'edit' ? 'Edit Category' : 'New Category';
        if (mode === 'new') {
            document.getElementById('cat-id').value = '';
            document.getElementById('cat-name').value = '';
            document.getElementById('cat-desc').value = '';
        } else {
            window.electronAPI.getCategories().then(cats => {
                const c = cats.find(x => x.id === selectedId);
                if (!c) return;
                document.getElementById('cat-id').value = c.id;
                document.getElementById('cat-name').value = c.name;
                document.getElementById('cat-desc').value = c.description || '';
            });
        }
    };

    window.closeCategoryModal = () => document.getElementById('category-modal').classList.remove('active');

    window.saveCategory = async () => {
        const id = document.getElementById('cat-id').value;
        const name = document.getElementById('cat-name').value.trim();
        const description = document.getElementById('cat-desc').value.trim();
        if (!name) { window.showToast('Category name is required', 'warning'); return; }
        try {
            if (id) await window.electronAPI.updateCategory({ id, name, description });
            else await window.electronAPI.addCategory({ name, description });
            window.closeCategoryModal();
            await refreshCategories();
            window.showToast('Category saved', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };

    window.deleteCategory = async () => {
        if (!selectedId) { window.showToast('Select a category first', 'info'); return; }
        const ok = window.confirmDialog ? await window.confirmDialog('Delete this category?', { danger: true }) : confirm('Delete this category?');
        if (!ok) return;
        try {
            await window.electronAPI.deleteCategory(selectedId);
            selectedId = null;
            await refreshCategories();
            window.showToast('Category deleted', 'success');
        } catch (e) { window.showToast(e.message, 'error'); }
    };
}

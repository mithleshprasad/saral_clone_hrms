document.addEventListener('DOMContentLoaded', () => {
    // Inject Title Bar HTML
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.innerHTML = `
        <div class="title-drag-area">
            <span class="app-title">MpxHR</span>
        </div>
        <div class="window-controls">
            <button class="control-btn" id="min-btn" title="Minimize"><i class="fas fa-minus"></i></button>
            <button class="control-btn" id="max-btn" title="Maximize"><i class="far fa-square"></i></button>
            <button class="control-btn" id="close-btn" title="Close"><i class="fas fa-times"></i></button>
        </div>
    `;
    document.body.insertAdjacentElement('afterbegin', titleBar);

    // Attach Event Listeners
    document.getElementById('min-btn').addEventListener('click', () => {
        window.electronAPI.minimize();
    });
    document.getElementById('max-btn').addEventListener('click', () => {
        window.electronAPI.maximize();
    });
    document.getElementById('close-btn').addEventListener('click', () => {
        window.electronAPI.close();
    });
});

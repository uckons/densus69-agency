(() => {
    const sidebar = document.getElementById('sidebar');
    const openButton = document.getElementById('open-sidebar');
    const closeButton = document.getElementById('close-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar || !openButton || !closeButton || !backdrop) return;

    openButton.setAttribute('aria-label', 'Buka menu');
    openButton.setAttribute('aria-controls', 'sidebar');
    openButton.setAttribute('aria-expanded', 'false');
    function setOpen(open, restoreFocus = false) {
        sidebar.classList.toggle('-translate-x-full', !open);
        backdrop.hidden = !open;
        openButton.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('admin-menu-open', open);
        if (open) closeButton.focus();
        else if (restoreFocus) openButton.focus();
    }
    openButton.addEventListener('click', () => setOpen(true));
    closeButton.addEventListener('click', () => setOpen(false, true));
    backdrop.addEventListener('click', () => setOpen(false, true));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !backdrop.hidden) setOpen(false, true);
    });
    sidebar.addEventListener('click', event => {
        if (event.target.closest('a') && window.innerWidth < 768) setOpen(false);
    });
    window.matchMedia('(min-width: 768px)').addEventListener('change', () => setOpen(false));
})();

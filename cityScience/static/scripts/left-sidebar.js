// menu.js
function toggleMenu(element) {
    const menuItem = element.parentElement;
    const isActive = menuItem.classList.contains('active');
    
    // Close all other menus
    document.querySelectorAll('.menu-item').forEach(item => {
        if (item !== menuItem) {
            item.classList.remove('active');
        }
    });
    
    // Toggle the current menu
    if (isActive) {
        menuItem.classList.remove('active');
    } else {
        menuItem.classList.add('active');
    }
}

// Add interactivity to sub-items
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', async function() {
            // Remove previous selection
            document.querySelectorAll('.submenu-item').forEach(subitem => {
                subitem.style.background = '';
                subitem.style.color = '';
            });

            // Add current selection
            this.style.background = 'rgba(52, 152, 219, 0.2)';
            this.style.color = '#3498db';

            // Determine a slug for the section file based on the button text
            const text = this.textContent.trim().toLowerCase();
            // Simple slugify: remove accents, replace spaces with '-', remove non-alphanumeric
            const slug = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

            // Try to fetch the section HTML from /sections/<slug>.html (server should serve these)
            const workspace = document.querySelector('.workspace');
            if(!workspace) return;
            try{
                const resp = await fetch(`/static/sections/${slug}.html`);
                if(resp.ok){
                    const html = await resp.text();
                    workspace.innerHTML = html;
                } else {
                    // Fallback message
                    workspace.innerHTML = `<div class="content-card"><h2>Content Not Found</h2><p>File /sections/${slug}.html not found (status ${resp.status}).</p></div>`;
                }
            }catch(err){
                workspace.innerHTML = `<div class="content-card"><h2>Error Loading</h2><p>${err.toString()}</p></div>`;
            }
        });
    });
});

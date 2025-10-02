// menu.js
function toggleMenu(element) {
    const menuItem = element.parentElement;
    const isActive = menuItem.classList.contains('active');
    
    // Fecha todos os outros menus
    document.querySelectorAll('.menu-item').forEach(item => {
        if (item !== menuItem) {
            item.classList.remove('active');
        }
    });
    
    // Alterna o menu atual
    if (isActive) {
        menuItem.classList.remove('active');
    } else {
        menuItem.classList.add('active');
    }
}

// Adiciona interatividade aos subtópicos
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', async function() {
            // Remove seleção anterior
            document.querySelectorAll('.submenu-item').forEach(subitem => {
                subitem.style.background = '';
                subitem.style.color = '';
            });

            // Adiciona seleção atual
            this.style.background = 'rgba(52, 152, 219, 0.2)';
            this.style.color = '#3498db';

            // determine a slug for the section file based on the button text
            const text = this.textContent.trim().toLowerCase();
            // simple slugify: remove accents, replace spaces with '-', remove non-alphanum
            const slug = text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

            // try to fetch the section HTML from /sections/<slug>.html (server should serve these)
            const workspace = document.querySelector('.workspace');
            if(!workspace) return;
            try{
                const resp = await fetch(`/static/sections/${slug}.html`);
                if(resp.ok){
                    const html = await resp.text();
                    workspace.innerHTML = html;
                } else {
                    // fallback message
                    workspace.innerHTML = `<div class="content-card"><h2>Conteúdo não encontrado</h2><p>Arquivo /sections/${slug}.html não encontrado (status ${resp.status}).</p></div>`;
                }
            }catch(err){
                workspace.innerHTML = `<div class="content-card"><h2>Erro ao carregar</h2><p>${err.toString()}</p></div>`;
            }
        });
    });
});

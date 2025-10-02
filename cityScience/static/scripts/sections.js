function activateMenu(element) {
    // Remove classe active dos menus
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    element.parentElement.classList.add('active');

    // Mostrar a seção correspondente no workspace
    const target = element.parentElement.getAttribute('data-target');
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(target).classList.add('active');
}

// Ativar a primeira seção por padrão
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.menu-item').classList.add('active');
    document.querySelector('.content-section').classList.add('active');
});
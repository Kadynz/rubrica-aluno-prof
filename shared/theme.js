// Tema claro/escuro compartilhado. Dispara um CustomEvent `themechange`
// no document quando o usuário alterna, para que cada portal aplique seus
// próprios efeitos colaterais (ex.: Chart.defaults, re-render de gráficos).

(function () {
    const KEY = 'theme';

    const inicial = localStorage.getItem(KEY) || 'light';
    if (inicial === 'dark') document.body.setAttribute('data-theme', 'dark');

    function estaEscuro() {
        return document.body.getAttribute('data-theme') === 'dark';
    }

    function notificar() {
        document.dispatchEvent(new CustomEvent('themechange', { detail: { isDark: estaEscuro() } }));
    }

    function montar() {
        const btn = document.getElementById('btnThemeToggle');
        if (!btn) return;

        const atualizarIcone = () => {
            btn.innerHTML = estaEscuro()
                ? '<i class="fas fa-sun"></i>'
                : '<i class="fas fa-moon"></i>';
        };
        atualizarIcone();

        btn.addEventListener('click', () => {
            const escuro = estaEscuro();
            if (escuro) document.body.removeAttribute('data-theme');
            else document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem(KEY, escuro ? 'light' : 'dark');
            atualizarIcone();
            notificar();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', montar);
    } else {
        montar();
    }
})();

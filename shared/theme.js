// Tema claro/escuro compartilhado. Dispara um CustomEvent `themechange`
// no document quando o usuário alterna, para que cada portal aplique seus
// próprios efeitos colaterais (ex.: re-render de gráficos).

(function () {
    const KEY = 'theme';

    const inicial = localStorage.getItem(KEY) || 'light';
    if (inicial === 'dark') document.body.setAttribute('data-theme', 'dark');

    function estaEscuro() {
        return document.body.getAttribute('data-theme') === 'dark';
    }

    // Aplica defaults de Chart.js ao tema atual. No-op se Chart.js não foi
    // carregado nesta página — o módulo é opt-in por presença da lib.
    function aplicarTemaAosGraficos() {
        if (typeof Chart === 'undefined') return;
        const isDark = estaEscuro();
        Chart.defaults.color = isDark ? '#f8fafc' : '#0f172a';
        Chart.defaults.borderColor = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.15)';
    }

    function notificar() {
        aplicarTemaAosGraficos();
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

    // Aplica defaults no carregamento inicial para o tema persistido.
    aplicarTemaAosGraficos();
    window.aplicarTemaAosGraficos = aplicarTemaAosGraficos;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', montar);
    } else {
        montar();
    }
})();

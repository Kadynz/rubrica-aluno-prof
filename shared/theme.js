// Tema claro/escuro compartilhado. Dispara um CustomEvent `themechange`
// no document quando o usuário alterna, para que cada portal aplique seus
// próprios efeitos colaterais (ex.: re-render de gráficos).

(function () {
    const KEY = 'theme';

    function temaSalvo() {
        try {
            return localStorage.getItem(KEY) || 'dark';
        } catch {
            return 'dark';
        }
    }

    function aplicarTema(theme) {
        const escuro = theme === 'dark';
        if (escuro) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (document.body) document.body.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (document.body) document.body.removeAttribute('data-theme');
        }
    }

    aplicarTema(temaSalvo());

    function estaEscuro() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
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
            const escuro = estaEscuro();
            btn.innerHTML = escuro
                ? '<i class="fas fa-sun"></i>'
                : '<i class="fas fa-moon"></i>';
            btn.setAttribute('aria-pressed', String(escuro));
            btn.setAttribute('aria-label', escuro ? 'Tema escuro ativo. Alternar para tema claro' : 'Tema claro ativo. Alternar para tema escuro');
        };
        atualizarIcone();

        btn.addEventListener('click', () => {
            const escuro = estaEscuro();
            const novoTema = escuro ? 'light' : 'dark';
            aplicarTema(novoTema);
            try {
                localStorage.setItem(KEY, novoTema);
            } catch {
                // O tema visual já foi aplicado; a persistência pode falhar em modo privado.
            }
            atualizarIcone();
            notificar();
        });
    }

    // Aplica defaults no carregamento inicial para o tema persistido.
    aplicarTemaAosGraficos();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', montar);
    } else {
        montar();
    }
})();

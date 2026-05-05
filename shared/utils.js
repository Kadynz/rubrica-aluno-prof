// Utilidades compartilhadas entre os portais (Aluno e Professor).
// Expostas como globais — este projeto não usa bundler nem ES Modules.

const NIVEL_CORES = { 1: '#991b1b', 2: '#b45309', 3: '#0369a1', 4: '#166534' };
const NIVEL_CURTO = { 1: 'Inic.', 2: 'Bás.', 3: 'Prof.', 4: 'Avanç.' };

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"'`=\/]/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
    }[s]));
}

function formatarData(iso) {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
}

function isoLocal(date = new Date()) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
}

function hoje() {
    return isoLocal();
}

function sortByDate(arr) {
    arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return arr;
}

function corPontoNivel(v) {
    return NIVEL_CORES[v] || 'transparent';
}

function labelNivelCurto(v) {
    return NIVEL_CURTO[v] || '';
}

// Rejeita tudo fora do conjunto permitido para imagens (MIME + base64).
// Bloqueia data:image/svg+xml e variantes "data:image/..." sem base64.
function validarFotoDataUrl(s) {
    return typeof s === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
}

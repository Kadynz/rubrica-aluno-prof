let turmas = [];
let alunos = [];
let avaliacoes = [];
let turmaAtiva = null;
let alunoAtivo = null;

const K_TURMAS = 'prof_turmas_v1';
const K_ALUNOS = 'prof_alunos_v1';
const K_AVALS = 'prof_avaliacoes_v1';

const PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16'];

const DESEMPENHO = {
    1: { emoji: '🔴', texto: 'Iniciante', cls: 'chip-1' },
    2: { emoji: '🟠', texto: 'Básico', cls: 'chip-2' },
    3: { emoji: '🔵', texto: 'Proficiente', cls: 'chip-3' },
    4: { emoji: '🟢', texto: 'Avançado', cls: 'chip-4' },
};
const QUALIDADE = {
    1: { emoji: '🔴', texto: 'Confusa', cls: 'chip-1' },
    2: { emoji: '🟠', texto: 'Regular', cls: 'chip-2' },
    3: { emoji: '🔵', texto: 'Boa', cls: 'chip-3' },
    4: { emoji: '🟢', texto: 'Excelente', cls: 'chip-4' },
};
const EVOLUCAO = {
    1: { emoji: '⬇️', texto: 'Regrediu', cls: 'chip-evo-1' },
    2: { emoji: '➡️', texto: 'Manteve', cls: 'chip-evo-2' },
    3: { emoji: '⬆️', texto: 'Progrediu', cls: 'chip-evo-3' },
    4: { emoji: '🚀', texto: 'Evoluiu muito', cls: 'chip-evo-4' },
};

// escapeHtml, formatarData e hoje vêm de ../shared/utils.js

function mostrar(id) { document.getElementById(id).classList.add('visivel'); }
function ocultar(id) { document.getElementById(id).classList.remove('visivel'); }

function carregarChave(k) {
    try {
        const r = localStorage.getItem(k);
        const p = r ? JSON.parse(r) : [];
        return Array.isArray(p) ? p : [];
    } catch {
        return [];
    }
}

function carregar() {
    turmas = carregarChave(K_TURMAS);
    alunos = carregarChave(K_ALUNOS);
    avaliacoes = carregarChave(K_AVALS);
}

function salvar(comGraficos = false) {
    localStorage.setItem(K_TURMAS, JSON.stringify(turmas));
    localStorage.setItem(K_ALUNOS, JSON.stringify(alunos));
    localStorage.setItem(K_AVALS, JSON.stringify(avaliacoes));
    if (comGraficos) renderGraficos();
}

// ============================================================
// === FOTOS DOS ALUNOS (opcional, client-side, localStorage) ===
// ============================================================
const K_FOTO_CONSENT = 'prof_foto_consent_v1';
const FOTO_MAX_INPUT_BYTES = 10 * 1024 * 1024;
const FOTO_MIN_DIM = 100;
const FOTO_OUTPUT_DIM = 256;
const FOTO_QUALIDADES = [0.75, 0.6, 0.5];
const FOTO_ALVO_BYTES = 100 * 1024;
const FOTO_STORAGE_WARN_BYTES = 4 * 1024 * 1024;

// Backend de fotos: IndexedDB quando disponível, senão localStorage legado.
// A migração de dados inline (aluno.foto) acontece em initApp() e é idempotente.
const IDB_NAME = 'rubrica_professor';
const IDB_VERSION = 1;
const IDB_STORE_FOTOS = 'fotos';
const K_FOTOS_MIGRADO = 'prof_fotos_migrated_v1';

let fotosBackend = 'localStorage';   // 'idb' | 'localStorage'
const fotosManifest = new Set();     // ids de alunos que têm foto (em qualquer backend)
const fotosObjectURLs = new Map();   // alunoId -> blob URL ativo
let idbPromise = null;

function abrirIDB() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('IndexedDB indisponível neste navegador.')); return; }
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE_FOTOS)) db.createObjectStore(IDB_STORE_FOTOS);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Falha ao abrir IndexedDB.'));
        req.onblocked = () => reject(new Error('IndexedDB bloqueado por outra aba.'));
    });
    return idbPromise;
}

function idbPutFoto(alunoId, blob) {
    return abrirIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_FOTOS, 'readwrite');
        tx.objectStore(IDB_STORE_FOTOS).put(blob, alunoId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}

function idbGetFoto(alunoId) {
    return abrirIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_FOTOS, 'readonly');
        const req = tx.objectStore(IDB_STORE_FOTOS).get(alunoId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    }));
}

function idbDeleteFoto(alunoId) {
    return abrirIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_FOTOS, 'readwrite');
        tx.objectStore(IDB_STORE_FOTOS).delete(alunoId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function idbAllFotoIds() {
    return abrirIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_FOTOS, 'readonly');
        const req = tx.objectStore(IDB_STORE_FOTOS).getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    }));
}

function idbClearFotos() {
    return abrirIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE_FOTOS, 'readwrite');
        tx.objectStore(IDB_STORE_FOTOS).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function dataUrlParaBlob(dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
    if (!match) return null;
    try {
        const bin = atob(match[2]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: match[1] });
    } catch { return null; }
}

function blobParaDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
    });
}

function revogarObjectURL(alunoId) {
    const url = fotosObjectURLs.get(alunoId);
    if (url) { URL.revokeObjectURL(url); fotosObjectURLs.delete(alunoId); }
}

function revogarTodosObjectURLs() {
    fotosObjectURLs.forEach(url => URL.revokeObjectURL(url));
    fotosObjectURLs.clear();
}

async function migrarFotosLegadas() {
    if (localStorage.getItem(K_FOTOS_MIGRADO) === 'true') return;
    const legadas = alunos.filter(a => typeof a.foto === 'string' && a.foto.startsWith('data:image/'));
    if (!legadas.length) { localStorage.setItem(K_FOTOS_MIGRADO, 'true'); return; }
    for (const a of legadas) {
        const blob = dataUrlParaBlob(a.foto);
        if (!blob) continue;
        await idbPutFoto(a.id, blob); // erro aqui propaga e aborta a migração (sem setar flag)
    }
    // Sucesso: remove o campo foto dos registros e persiste.
    alunos = alunos.map(a => {
        if (typeof a.foto !== 'string') return a;
        const { foto, ...rest } = a;
        return rest;
    });
    localStorage.setItem(K_ALUNOS, JSON.stringify(alunos));
    localStorage.setItem(K_FOTOS_MIGRADO, 'true');
    console.info(`[Fotos] Migração concluída: ${legadas.length} foto(s) movida(s) para IndexedDB.`);
}

async function prepararBackendFotos() {
    try {
        await abrirIDB();
        fotosBackend = 'idb';
        await migrarFotosLegadas();
        const ids = await idbAllFotoIds();
        fotosManifest.clear();
        ids.forEach(id => fotosManifest.add(id));
    } catch (err) {
        console.warn('[Fotos] IndexedDB indisponível, usando localStorage legado:', err);
        fotosBackend = 'localStorage';
        fotosManifest.clear();
        alunos.forEach(a => {
            if (typeof a.foto === 'string' && a.foto.startsWith('data:image/')) fotosManifest.add(a.id);
        });
    }
}

function iniciaisDoNome(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    const p1 = partes[0][0] || '';
    const p2 = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (p1 + p2).toUpperCase() || '?';
}

function corDoAluno(id) {
    const hue = Math.abs(Number(id) | 0) % 360;
    return `hsl(${hue}, 55%, 45%)`;
}

function alunoTemFoto(aluno) {
    if (!aluno) return false;
    if (fotosManifest.has(aluno.id)) return true;
    return typeof aluno.foto === 'string' && aluno.foto.startsWith('data:image/');
}

function renderAvatar(aluno) {
    const alt = escapeHtml(aluno.nome || 'aluno');
    const iniciais = escapeHtml(iniciaisDoNome(aluno.nome));
    if (alunoTemFoto(aluno)) {
        // src é preenchido por carregarImagensLazy após o DOM entrar em tela
        return `<div class="aluno-avatar aluno-avatar-com-foto" data-avatar-id="${aluno.id}" role="button" tabindex="0" aria-label="Alterar ou remover foto de ${alt}" title="Alterar ou remover foto">
            <img data-foto-id="${aluno.id}" alt="Foto de ${alt}" loading="lazy">
            <span class="aluno-avatar-overlay"><i class="fas fa-camera"></i></span>
        </div>`;
    }
    return `<div class="aluno-avatar aluno-avatar-sem-foto" data-avatar-id="${aluno.id}" role="button" tabindex="0" aria-label="Adicionar foto de ${alt}" title="Adicionar foto" style="background:${corDoAluno(aluno.id)};">
        <span class="aluno-avatar-iniciais">${iniciais}</span>
        <span class="aluno-avatar-overlay"><i class="fas fa-camera"></i></span>
    </div>`;
}

async function carregarImagensLazy(rootEl) {
    if (!rootEl) return;
    const imgs = rootEl.querySelectorAll('img[data-foto-id]');
    for (const img of imgs) {
        const id = Number(img.dataset.fotoId);
        if (fotosBackend === 'idb') {
            let url = fotosObjectURLs.get(id);
            if (!url) {
                try {
                    const blob = await idbGetFoto(id);
                    if (!blob) continue;
                    url = URL.createObjectURL(blob);
                    fotosObjectURLs.set(id, url);
                } catch (err) {
                    console.warn('[Fotos] Falha ao carregar foto', id, err);
                    continue;
                }
            }
            img.src = url;
        } else {
            const aluno = alunos.find(a => a.id === id);
            if (aluno && typeof aluno.foto === 'string') img.src = aluno.foto;
        }
    }
}

function jaConsentiuFoto() {
    try {
        const raw = localStorage.getItem(K_FOTO_CONSENT);
        const p = raw ? JSON.parse(raw) : null;
        return !!(p && p.aceito);
    } catch { return false; }
}

function registrarConsentimentoFoto() {
    localStorage.setItem(K_FOTO_CONSENT, JSON.stringify({ aceito: true, data: new Date().toISOString() }));
}

function mostrarModalConsentimento({ apenasLeitura = false } = {}) {
    return new Promise(resolve => {
        const dlg = document.getElementById('modalFotoConsent');
        const btnOk = document.getElementById('btnFotoConsentOk');
        const btnCancel = document.getElementById('btnFotoConsentCancel');
        const chk = document.getElementById('chkFotoConsent');
        const chkWrap = document.getElementById('wrapChkFotoConsent');

        chk.checked = false;
        if (apenasLeitura) {
            chkWrap.style.display = 'none';
            btnOk.disabled = false;
            btnOk.textContent = 'Fechar';
            btnCancel.style.display = 'none';
        } else {
            chkWrap.style.display = '';
            btnOk.disabled = true;
            btnOk.textContent = 'Aceitar e selecionar foto';
            btnCancel.style.display = '';
        }

        let resultado = false;
        const onChk = () => { if (!apenasLeitura) btnOk.disabled = !chk.checked; };
        const onOk = () => { resultado = !apenasLeitura; dlg.close(); };
        const onCancel = () => { resultado = false; dlg.close(); };
        const onClose = () => {
            chk.removeEventListener('change', onChk);
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
            dlg.removeEventListener('close', onClose);
            resolve(resultado);
        };

        chk.addEventListener('change', onChk);
        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        dlg.addEventListener('close', onClose);
        dlg.showModal();
    });
}

function mostrarMenuFotoExistente() {
    return new Promise(resolve => {
        const dlg = document.getElementById('modalFotoAcoes');
        const btnTrocar = document.getElementById('btnFotoTrocar');
        const btnRemover = document.getElementById('btnFotoRemover');
        const btnCancel = document.getElementById('btnFotoAcoesCancel');

        let acao = null;
        const onTrocar = () => { acao = 'trocar'; dlg.close(); };
        const onRemover = () => { acao = 'remover'; dlg.close(); };
        const onCancel = () => { acao = null; dlg.close(); };
        const onClose = () => {
            btnTrocar.removeEventListener('click', onTrocar);
            btnRemover.removeEventListener('click', onRemover);
            btnCancel.removeEventListener('click', onCancel);
            dlg.removeEventListener('close', onClose);
            resolve(acao);
        };

        btnTrocar.addEventListener('click', onTrocar);
        btnRemover.addEventListener('click', onRemover);
        btnCancel.addEventListener('click', onCancel);
        dlg.addEventListener('close', onClose);
        dlg.showModal();
    });
}

async function processarImagem(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        throw new Error('Tipo de arquivo não suportado. Use JPG, PNG ou WebP.');
    }
    if (file.size > FOTO_MAX_INPUT_BYTES) {
        throw new Error(`Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo permitido: 10 MB.`);
    }
    const blobUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('Imagem inválida ou corrompida.'));
            i.src = blobUrl;
        });
        if (img.naturalWidth < FOTO_MIN_DIM || img.naturalHeight < FOTO_MIN_DIM) {
            throw new Error(`Imagem muito pequena (${img.naturalWidth}×${img.naturalHeight}). Mínimo: ${FOTO_MIN_DIM}×${FOTO_MIN_DIM} px.`);
        }
        const size = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - size) / 2;
        const sy = (img.naturalHeight - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = FOTO_OUTPUT_DIM;
        canvas.height = FOTO_OUTPUT_DIM;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, size, size, 0, 0, FOTO_OUTPUT_DIM, FOTO_OUTPUT_DIM);
        let dataUrl = canvas.toDataURL('image/jpeg', FOTO_QUALIDADES[0]);
        for (let i = 1; i < FOTO_QUALIDADES.length; i++) {
            if (dataUrl.length <= FOTO_ALVO_BYTES * 1.4) break;
            dataUrl = canvas.toDataURL('image/jpeg', FOTO_QUALIDADES[i]);
        }
        return dataUrl;
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

function estimarStorageBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k);
        total += ((k && k.length) || 0) + ((v && v.length) || 0);
    }
    return total * 2;
}

async function setFotoAluno(alunoId, fotoDataUrl) {
    const idx = alunos.findIndex(a => a.id === alunoId);
    if (idx === -1) return false;

    // Remoção: limpa IDB (se houver), campo legado e manifest.
    if (fotoDataUrl === null) {
        if (fotosBackend === 'idb') {
            try { await idbDeleteFoto(alunoId); }
            catch (err) { alert('Falha ao remover foto: ' + (err?.message || err)); return false; }
        }
        if (alunos[idx].foto !== undefined) {
            delete alunos[idx].foto;
            try { localStorage.setItem(K_ALUNOS, JSON.stringify(alunos)); } catch { /* foto legado raro; ignorar */ }
        }
        fotosManifest.delete(alunoId);
        revogarObjectURL(alunoId);
        return true;
    }

    // Escrita no IndexedDB (backend preferido).
    if (fotosBackend === 'idb') {
        const blob = dataUrlParaBlob(fotoDataUrl);
        if (!blob) { alert('Imagem inválida.'); return false; }
        try {
            await idbPutFoto(alunoId, blob);
            fotosManifest.add(alunoId);
            revogarObjectURL(alunoId);
            // Campo legado (se ainda existir em registros antigos) deixa de ser fonte de verdade.
            if (alunos[idx].foto !== undefined) {
                delete alunos[idx].foto;
                try { localStorage.setItem(K_ALUNOS, JSON.stringify(alunos)); } catch { /* ignorar */ }
            }
            return true;
        } catch (err) {
            const msg = err && err.name === 'QuotaExceededError'
                ? 'Armazenamento do navegador cheio. Exporte um backup e apague fotos antigas.'
                : 'Falha ao salvar foto: ' + (err?.message || err);
            alert(msg);
            return false;
        }
    }

    // Fallback legado: foto inline em localStorage (navegadores sem IndexedDB).
    const previa = alunos[idx].foto;
    alunos[idx] = { ...alunos[idx], foto: fotoDataUrl };
    try {
        localStorage.setItem(K_ALUNOS, JSON.stringify(alunos));
        fotosManifest.add(alunoId);
    } catch (err) {
        if (previa !== undefined) alunos[idx].foto = previa;
        else delete alunos[idx].foto;
        if (err && err.name === 'QuotaExceededError') {
            alert('Armazenamento do navegador cheio. Exporte um backup JSON, apague dados antigos e tente novamente.');
        } else {
            alert('Não foi possível salvar a foto: ' + (err?.message || err));
        }
        return false;
    }
    if (estimarStorageBytes() > FOTO_STORAGE_WARN_BYTES) {
        console.warn('[Fotos] Uso de storage acima de 4 MB — considere exportar backup.');
    }
    return true;
}

function selecionarArquivoFoto() {
    return new Promise(resolve => {
        const inp = document.getElementById('fileFoto');
        let finalizado = false;
        const finish = (file) => {
            if (finalizado) return;
            finalizado = true;
            inp.removeEventListener('change', onChange);
            inp.removeEventListener('cancel', onCancel);
            inp.value = '';
            resolve(file);
        };
        const onChange = () => finish(inp.files && inp.files[0] ? inp.files[0] : null);
        const onCancel = () => finish(null);
        inp.addEventListener('change', onChange);
        inp.addEventListener('cancel', onCancel);
        inp.click();
    });
}

async function aoClicarAvatar(alunoId) {
    const aluno = alunos.find(a => a.id === alunoId);
    if (!aluno) return;

    if (alunoTemFoto(aluno)) {
        const acao = await mostrarMenuFotoExistente();
        if (acao === 'remover') {
            if (await setFotoAluno(alunoId, null)) renderAlunos();
            return;
        }
        if (acao !== 'trocar') return;
    }

    if (!jaConsentiuFoto()) {
        const ok = await mostrarModalConsentimento();
        if (!ok) return;
        registrarConsentimentoFoto();
    }

    const file = await selecionarArquivoFoto();
    if (!file) return;
    try {
        const dataUrl = await processarImagem(file);
        if (await setFotoAluno(alunoId, dataUrl)) renderAlunos();
    } catch (err) {
        alert(err && err.message ? err.message : 'Falha ao processar a imagem.');
    }
}

function inserirBannerFotoConsent() {
    const secao = document.getElementById('secaoAlunos');
    if (!secao || document.getElementById('bannerFotoConsent')) return;
    const header = secao.querySelector('.card-header');
    if (!header) return;
    const banner = document.createElement('div');
    banner.id = 'bannerFotoConsent';
    banner.className = 'banner-foto-consent';
    banner.innerHTML = `<i class="fas fa-circle-info"></i>
        <span>Fotos cadastradas são de <strong>responsabilidade legal do educador</strong> (LGPD / direito de imagem).</span>
        <button type="button" id="btnVerTermosFoto">Ver termos</button>`;
    header.insertAdjacentElement('afterend', banner);
    document.getElementById('btnVerTermosFoto').addEventListener('click', () => {
        mostrarModalConsentimento({ apenasLeitura: true });
    });
}

function adicionarTurma() {
    const inp = document.getElementById('novaTurma');
    const nome = inp.value.trim();
    if (!nome) { inp.focus(); return; }
    turmas.push({ id: Date.now(), nome });
    salvar();
    inp.value = '';
    renderTurmas();
}

document.getElementById('novaTurma').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarTurma(); }
});
// Attach to Adicionar button (removed inline onclick from HTML)
document.getElementById('btnNovaTurma').addEventListener('click', adicionarTurma);

function excluirTurma(id) {
    const idsSet = new Set(alunos.filter(a => a.turmaId === id).map(a => a.id));
    const msg = idsSet.size ? `Excluir esta turma? ${idsSet.size} aluno(s) e avaliações serão removidos.` : 'Excluir esta turma?';
    if (!confirm(msg)) return;
    
    avaliacoes = avaliacoes.filter(av => !idsSet.has(av.alunoId));
    alunos = alunos.filter(a => a.turmaId !== id);
    turmas = turmas.filter(t => t.id !== id);
    salvar(true);
    
    if (turmaAtiva === id) {
        turmaAtiva = null;
        alunoAtivo = null;
        ocultar('secaoAlunos');
        ocultar('secaoAvaliacao');
        ocultar('secaoHistorico');
    }
    renderTurmas();
}

function selecionarTurma(id) {
    turmaAtiva = id;
    alunoAtivo = null;
    ocultar('secaoAvaliacao');
    ocultar('secaoHistorico');
    renderTurmas();
    renderAlunos();
    renderGraficos();
    mostrar('secaoAlunos');
}

function escopoAlunosEAvals() {
    const alunosEscopo = turmaAtiva ? alunos.filter(a => a.turmaId === turmaAtiva) : alunos;
    const idsEscopo = new Set(alunosEscopo.map(a => a.id));
    const avalsEscopo = avaliacoes.filter(av => idsEscopo.has(av.alunoId));
    return { alunosEscopo, avalsEscopo };
}

function renderTurmas() {
    const el = document.getElementById('listaTurmas');
    if (!turmas.length) {
        el.innerHTML = '<div class="aviso" aria-live="polite"><i class="fas fa-school"></i><br>Nenhuma turma cadastrada.</div>';
        return;
    }
    
    // DB Optimizer: Pre-calculate counts (prevent N+1 inside map)
    const countMap = alunos.reduce((acc, a) => {
        acc[a.turmaId] = (acc[a.turmaId] || 0) + 1;
        return acc;
    }, {});
    
    el.innerHTML = turmas.map(t => {
        const qtd = countMap[t.id] || 0;
        const cls = t.id === turmaAtiva ? ' ativa' : '';
        return `<div class="turma-item${cls}" data-id="${t.id}">
            <i class="fas fa-school" style="color:#16a34a;"></i>
            <span class="item-nome">${escapeHtml(t.nome)}</span>
            <span class="item-badge">${qtd} aluno${qtd !== 1 ? 's' : ''}</span>
            <button class="item-del" data-id="${t.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }).join('');
}

// Event Delegation for Turmas
document.getElementById('listaTurmas').addEventListener('click', e => {
    const delBtn = e.target.closest('.item-del');
    const item = e.target.closest('.turma-item');
    if (delBtn) {
        e.stopPropagation();
        excluirTurma(Number(delBtn.dataset.id));
    } else if (item) {
        selecionarTurma(Number(item.dataset.id));
    }
});

function adicionarAluno() {
    if (!turmaAtiva) return;
    const inp = document.getElementById('novoAluno');
    const nome = inp.value.trim();
    if (!nome) { inp.focus(); return; }
    alunos.push({ id: Date.now(), turmaId: turmaAtiva, nome });
    salvar();
    inp.value = '';
    renderTurmas();
    renderAlunos();
}

document.getElementById('novoAluno').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); adicionarAluno(); }
});
document.getElementById('btnNovoAluno').addEventListener('click', adicionarAluno);

function excluirAluno(id) {
    const qtd = avaliacoes.filter(av => av.alunoId === id).length;
    if (!confirm(qtd ? `Excluir aluno? ${qtd} avaliação(ões) removidas.` : 'Excluir aluno?')) return;
    avaliacoes = avaliacoes.filter(av => av.alunoId !== id);
    alunos = alunos.filter(a => a.id !== id);
    salvar(true);
    // Remove foto associada do backend ativo.
    if (fotosManifest.has(id)) {
        fotosManifest.delete(id);
        revogarObjectURL(id);
        if (fotosBackend === 'idb') idbDeleteFoto(id).catch(err => console.warn('[Fotos] Falha ao remover foto do aluno excluído:', err));
    }
    if (alunoAtivo === id) {
        alunoAtivo = null;
        ocultar('secaoAvaliacao');
        ocultar('secaoHistorico');
    }
    renderTurmas();
    renderAlunos();
}

function selecionarAluno(id) {
    alunoAtivo = id;
    limparFormAvaliacao();
    renderAlunos();
    renderHistorico();
    const a = alunos.find(a => a.id === id);
    document.getElementById('nomeAlunoSel').textContent = a ? a.nome : '—';
    document.getElementById('nomeAlunoHist').textContent = a ? a.nome : '—';
    mostrar('secaoAvaliacao');
    mostrar('secaoHistorico');
    document.getElementById('secaoAvaliacao').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderAlunos() {
    const turma = turmas.find(t => t.id === turmaAtiva);
    document.getElementById('nomeTurmaSel').textContent = turma ? turma.nome : '';
    const el = document.getElementById('listaAlunos');
    const list = alunos.filter(a => a.turmaId === turmaAtiva);
    if (!list.length) {
        el.innerHTML = '<div class="aviso" aria-live="polite"><i class="fas fa-user-slash"></i><br>Nenhum aluno nesta turma.</div>';
        return;
    }
    
    // DB Optimizer: pre-calculate evaluation counts
    const countMap = avaliacoes.reduce((acc, av) => {
        acc[av.alunoId] = (acc[av.alunoId] || 0) + 1;
        return acc;
    }, {});
    
    el.innerHTML = list.map(a => {
        const qtd = countMap[a.id] || 0;
        const cls = a.id === alunoAtivo ? ' ativo' : '';
        return `<div class="aluno-item${cls}" data-id="${a.id}">
            ${renderAvatar(a)}
            <span class="item-nome">${escapeHtml(a.nome)}</span>
            <span class="item-badge">${qtd} aval.</span>
            <button class="item-del" data-id="${a.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }).join('');
    carregarImagensLazy(el);
}

// Event Delegation for Alunos
document.getElementById('listaAlunos').addEventListener('click', e => {
    const avatarBtn = e.target.closest('.aluno-avatar');
    const delBtn = e.target.closest('.item-del');
    const item = e.target.closest('.aluno-item');
    if (avatarBtn) {
        e.stopPropagation();
        aoClicarAvatar(Number(avatarBtn.dataset.avatarId));
    } else if (delBtn) {
        e.stopPropagation();
        excluirAluno(Number(delBtn.dataset.id));
    } else if (item) {
        selecionarAluno(Number(item.dataset.id));
    }
});

document.getElementById('listaAlunos').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const avatarBtn = e.target.closest('.aluno-avatar');
    if (avatarBtn) {
        e.preventDefault();
        aoClicarAvatar(Number(avatarBtn.dataset.avatarId));
    }
});

document.getElementById('formAvaliacao').addEventListener('submit', e => {
    e.preventDefault();
    if (!alunoAtivo) return;
    const editId = document.getElementById('editAvalId').value;
    const date = document.getElementById('avalDate').value;
    const lesson = document.getElementById('avalLesson').value.trim();
    const desempenho = +document.getElementById('avalDesempenho').value;
    const aula = +document.getElementById('avalAula').value;
    const evolucao = +document.getElementById('avalEvolucao').value;
    
    if (!date) { alert('Selecione a data.'); return; }
    if (!lesson) { alert('Informe o nome da aula.'); return; }
    
    if (editId) {
        const idx = avaliacoes.findIndex(av => av.id === parseInt(editId, 10));
        if (idx !== -1) avaliacoes[idx] = { ...avaliacoes[idx], date, lesson, desempenho, aula, evolucao };
    } else {
        avaliacoes.push({ id: Date.now(), alunoId: alunoAtivo, date, lesson, desempenho, aula, evolucao });
    }
    avaliacoes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    salvar(true);
    renderAlunos();
    renderHistorico();
    limparFormAvaliacao();
});

document.getElementById('btnCancelarAval').addEventListener('click', limparFormAvaliacao);

function limparFormAvaliacao() {
    document.getElementById('editAvalId').value = '';
    document.getElementById('avalDate').value = hoje();
    document.getElementById('avalLesson').value = '';
    document.getElementById('avalDesempenho').value = '3';
    document.getElementById('avalAula').value = '3';
    document.getElementById('avalEvolucao').value = '2';
    document.getElementById('btnSalvarAval').innerHTML = '<i class="fas fa-save"></i> Salvar';
}

function editarAvaliacao(id) {
    const av = avaliacoes.find(a => a.id === id);
    if (!av) return;
    document.getElementById('editAvalId').value = av.id;
    document.getElementById('avalDate').value = av.date;
    document.getElementById('avalLesson').value = av.lesson;
    document.getElementById('avalDesempenho').value = av.desempenho;
    document.getElementById('avalAula').value = av.aula;
    document.getElementById('avalEvolucao').value = av.evolucao;
    document.getElementById('btnSalvarAval').innerHTML = '<i class="fas fa-pen"></i> Atualizar';
    document.getElementById('secaoAvaliacao').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function excluirAvaliacao(id) {
    if (!confirm('Excluir esta avaliação?')) return;
    avaliacoes = avaliacoes.filter(av => av.id !== id);
    salvar(true);
    renderHistorico();
}

function renderHistorico() {
    const el = document.getElementById('listaHistorico');
    let reg = avaliacoes.filter(av => av.alunoId === alunoAtivo);
    
    const filtroAula = document.getElementById('filtroAula').value.toLowerCase();
    const filtroData = document.getElementById('filtroData').value;
    
    if (filtroAula) {
        reg = reg.filter(av => av.lesson.toLowerCase().includes(filtroAula));
    }
    if (filtroData) {
        reg = reg.filter(av => av.date === filtroData);
    }
    
    if (!reg.length) {
        el.innerHTML = '<div class="aviso" aria-live="polite"><i class="fas fa-clipboard-list"></i><br>Nenhuma avaliação encontrada.</div>';
        return;
    }
    
    el.innerHTML = [...reg].reverse().map(av => {
        const d = DESEMPENHO[av.desempenho] || DESEMPENHO[1];
        const q = QUALIDADE[av.aula] || QUALIDADE[1];
        const ev = EVOLUCAO[av.evolucao] || EVOLUCAO[1];
        return `<div class="registro-item">
            <div class="registro-header">
                <span class="registro-nome"><i class="fas fa-chalkboard" style="color:#16a34a;margin-right:5px;"></i>${escapeHtml(av.lesson)}</span>
                <span class="registro-data"><i class="far fa-calendar"></i> ${formatarData(av.date)}</span>
            </div>
            <div class="niveis-info">
                <span class="nivel-chip ${d.cls}"><i class="fas fa-user-graduate"></i> ${d.emoji} ${d.texto}</span>
                <span class="nivel-chip ${q.cls}"><i class="fas fa-chalkboard"></i> ${q.emoji} ${q.texto}</span>
                <span class="nivel-chip ${ev.cls}"><i class="fas fa-arrow-trend-up"></i> ${ev.emoji} ${ev.texto}</span>
            </div>
            <div class="acoes">
                <button class="btn-edit" data-id="${av.id}"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-del-reg" data-id="${av.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
            </div>
        </div>`;
    }).join('');
}

// Event Delegation for Historico
document.getElementById('listaHistorico').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-del-reg');
    if (editBtn) {
        editarAvaliacao(Number(editBtn.dataset.id));
    } else if (delBtn) {
        excluirAvaliacao(Number(delBtn.dataset.id));
    }
});

// History Filters
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

const renderHistoricoDebounced = debounce(renderHistorico, 300);

document.getElementById('filtroAula').addEventListener('input', renderHistoricoDebounced);
document.getElementById('filtroData').addEventListener('input', renderHistoricoDebounced);

let chartLinha = null;
let chartQuadrante = null;

const quadrantPlugin = {
    id: 'quadrantLines',
    afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!scales.x || !scales.y || !chartArea) return;
        const midX = scales.x.getPixelForValue(2.5);
        const midY = scales.y.getPixelForValue(2.5);

        ctx.save();
        ctx.strokeStyle = 'rgba(100,116,139,0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);

        ctx.beginPath(); ctx.moveTo(midX, chartArea.top); ctx.lineTo(midX, chartArea.bottom); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(chartArea.left, midY); ctx.lineTo(chartArea.right, midY); ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(100,116,139,0.65)';
        ctx.fillText('🔄 Em Manutenção', chartArea.left + 4, chartArea.top + 13);
        ctx.fillText('🚀 Destaque', midX + 4, chartArea.top + 13);
        ctx.fillText('⚠️ Atenção', chartArea.left + 4, chartArea.bottom - 4);
        ctx.fillText('📈 Em Progresso', midX + 4, chartArea.bottom - 4);

        chart.data.datasets.forEach((ds, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.visible) return;
            meta.data.forEach(pt => {
                ctx.font = 'bold 10px system-ui, sans-serif';
                ctx.fillStyle = ds.backgroundColor;
                ctx.fillText(ds.label, pt.x + 10, pt.y - 5);
            });
        });

        ctx.restore();
    }
};

function renderGraficoLinha() {
    const { alunosEscopo, avalsEscopo } = escopoAlunosEAvals();
    const alunosComAvals = alunosEscopo.filter(a => avalsEscopo.some(av => av.alunoId === a.id));
    const empty = document.getElementById('emptyLinha');
    const wrapper = document.getElementById('wrapperLinha');

    if (!alunosComAvals.length) {
        empty.style.display = 'block';
        wrapper.style.display = 'none';
        if (chartLinha) { chartLinha.destroy(); chartLinha = null; }
        return;
    }
    empty.style.display = 'none';
    wrapper.style.display = 'block';

    const datas = [...new Set(avalsEscopo.map(av => av.date))].sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    const labels = datas.map(d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; });

    const alunoAvals = {};
    avalsEscopo.forEach(av => {
        if (!alunoAvals[av.alunoId]) alunoAvals[av.alunoId] = [];
        alunoAvals[av.alunoId].push(av);
    });

    const datasets = alunosComAvals.map((aluno, i) => {
        const cor = PALETTE[i % PALETTE.length];
        const avMap = {};
        (alunoAvals[aluno.id] || []).forEach(av => { avMap[av.date] = av.desempenho; });
        return {
            label: aluno.nome,
            data: datas.map(d => avMap[d] ?? null),
            spanGaps: true,
            borderColor: cor,
            backgroundColor: cor + '22',
            tension: 0.2,
            pointBackgroundColor: datas.map(d => {
                const v = avMap[d];
                if (!v) return 'transparent';
                return v === 1 ? '#991b1b' : v === 2 ? '#b45309' : v === 3 ? '#0369a1' : '#166534';
            }),
            pointBorderColor: 'white',
            pointRadius: datas.map(d => avMap[d] ? 5 : 0),
            pointHoverRadius: 7,
            borderWidth: 2,
        };
    });

    const ctx = document.getElementById('graficoLinha').getContext('2d');
    if (chartLinha) chartLinha.destroy();
    chartLinha = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0.5, max: 4.5,
                    ticks: { stepSize: 1, font: { size: 10 }, callback: v => ({ 1: 'Inic.', 2: 'Bás.', 3: 'Prof.', 4: 'Avanç.' }[v] || '') },
                    title: { display: true, text: 'Desempenho', font: { size: 10 } }
                },
                x: { ticks: { maxRotation: 40, font: { size: 10 } } }
            },
            plugins: {
                tooltip: { callbacks: { label: c => { const v = c.raw; if (v === null) return null; const d = DESEMPENHO[v]; return ` ${c.dataset.label}: ${d?.emoji} ${d?.texto || v}`; } } },
                legend: { labels: { font: { size: 10 }, boxWidth: 10 } }
            }
        }
    });
}

function renderGraficoQuadrante() {
    const { alunosEscopo, avalsEscopo } = escopoAlunosEAvals();
    const alunosComAvals = alunosEscopo.filter(a => avalsEscopo.some(av => av.alunoId === a.id));
    const empty = document.getElementById('emptyQuadrante');
    const wrapper = document.getElementById('wrapperQuadrante');

    if (!alunosComAvals.length) {
        empty.style.display = 'block';
        wrapper.style.display = 'none';
        if (chartQuadrante) { chartQuadrante.destroy(); chartQuadrante = null; }
        return;
    }
    empty.style.display = 'none';
    wrapper.style.display = 'block';

    const alunoAvals = {};
    avalsEscopo.forEach(av => {
        if (!alunoAvals[av.alunoId]) alunoAvals[av.alunoId] = [];
        alunoAvals[av.alunoId].push(av);
    });

    const datasets = alunosComAvals.map((aluno, i) => {
        const cor = PALETTE[i % PALETTE.length];
        const avs = alunoAvals[aluno.id] || [];
        const avgD = avs.reduce((s, av) => s + av.desempenho, 0) / avs.length;
        const avgE = avs.reduce((s, av) => s + av.evolucao, 0) / avs.length;
        return {
            label: aluno.nome,
            data: [{ x: avgE, y: avgD }],
            backgroundColor: cor,
            borderColor: 'white',
            borderWidth: 2,
            pointRadius: 9,
            pointHoverRadius: 11,
        };
    });

    const ctx = document.getElementById('graficoQuadrante').getContext('2d');
    if (chartQuadrante) chartQuadrante.destroy();
    chartQuadrante = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        plugins: [quadrantPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { right: 60 } },
            scales: {
                x: {
                    min: 0.5, max: 4.5,
                    title: { display: true, text: 'Evolução média', font: { size: 10 } },
                    ticks: { stepSize: 1, font: { size: 10 }, callback: v => ({ 1: 'Regrediu', 2: 'Manteve', 3: 'Progrediu', 4: 'Evoluiu' }[v] || '') }
                },
                y: {
                    min: 0.5, max: 4.5,
                    title: { display: true, text: 'Desempenho médio', font: { size: 10 } },
                    ticks: { stepSize: 1, font: { size: 10 }, callback: v => ({ 1: 'Inic.', 2: 'Bás.', 3: 'Prof.', 4: 'Avanç.' }[v] || '') }
                }
            },
            plugins: {
                tooltip: { callbacks: { label: c => [`${c.dataset.label}`, `Desempenho: ${c.raw.y.toFixed(1)}`, `Evolução: ${c.raw.x.toFixed(1)}`] } },
                legend: { display: false } // Custom plugin draws labels
            }
        }
    });
}

function renderGraficos() {
    renderGraficoLinha();
    renderGraficoQuadrante();
}

// Autenticação local (sem backend): credenciais salvas em localStorage com SHA-256 + salt.
const K_CREDS = 'prof_creds_v1';
const K_SESSION = 'prof_auth';

async function hashText(text, salt = '') {
    const data = new TextEncoder().encode(salt + text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function gerarSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function lerCreds() {
    try {
        const raw = localStorage.getItem(K_CREDS);
        if (!raw) return null;
        const c = JSON.parse(raw);
        return (c && c.userHash && c.passHash && c.salt) ? c : null;
    } catch { return null; }
}

function configurarTelaAuth(modo) {
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const warning = document.getElementById('authWarning');
    const btn = document.getElementById('btnEntrar');
    const reset = document.getElementById('btnResetAuth');
    const userInp = document.getElementById('userInput');
    const passInp = document.getElementById('senhaInput');
    const erro = document.getElementById('loginErro');

    erro.style.display = 'none';
    userInp.value = '';
    passInp.value = '';

    if (modo === 'signup') {
        title.innerHTML = '<i class="fas fa-user-plus" style="color:var(--icon-color); margin-bottom:15px; font-size:2.5rem;"></i><br>Criar acesso';
        subtitle.textContent = 'Escolha um usuário e senha. Eles ficam salvos só neste navegador.';
        warning.style.display = 'block';
        btn.textContent = 'Criar e entrar';
        reset.style.display = 'none';
        passInp.setAttribute('autocomplete', 'new-password');
    } else {
        title.innerHTML = '<i class="fas fa-lock" style="color:var(--icon-color); margin-bottom:15px; font-size:2.5rem;"></i><br>Acesso do Professor';
        subtitle.textContent = 'Digite seu usuário e senha para entrar.';
        warning.style.display = 'none';
        btn.textContent = 'Entrar';
        reset.style.display = 'inline-block';
        passInp.setAttribute('autocomplete', 'current-password');
    }
    setTimeout(() => userInp.focus(), 50);
}

async function handleAuth() {
    const userVal = document.getElementById('userInput').value.trim();
    const passVal = document.getElementById('senhaInput').value;
    const erro = document.getElementById('loginErro');
    const creds = lerCreds();
    const mostrarErro = msg => { erro.textContent = msg; erro.style.display = 'block'; };

    if (!userVal || !passVal) { mostrarErro('Preencha usuário e senha.'); return; }

    if (!creds) {
        if (userVal.length < 3) { mostrarErro('Usuário deve ter pelo menos 3 caracteres.'); return; }
        if (passVal.length < 6) { mostrarErro('Senha deve ter pelo menos 6 caracteres.'); return; }
        const salt = gerarSalt();
        const userHash = await hashText(userVal, salt);
        const passHash = await hashText(passVal, salt);
        localStorage.setItem(K_CREDS, JSON.stringify({ userHash, passHash, salt }));
        sessionStorage.setItem(K_SESSION, 'true');
        initApp();
        return;
    }

    const userHash = await hashText(userVal, creds.salt);
    const passHash = await hashText(passVal, creds.salt);
    if (userHash === creds.userHash && passHash === creds.passHash) {
        sessionStorage.setItem(K_SESSION, 'true');
        initApp();
    } else {
        mostrarErro('Usuário ou senha incorretos.');
    }
}

async function resetarAcesso() {
    if (!confirm('Isso apaga credenciais, turmas, alunos, avaliações e fotos deste navegador. Continuar?')) return;
    if (!confirm('Tem CERTEZA? Não há como recuperar os dados depois.')) return;
    localStorage.removeItem(K_CREDS);
    localStorage.removeItem(K_TURMAS);
    localStorage.removeItem(K_ALUNOS);
    localStorage.removeItem(K_AVALS);
    localStorage.removeItem(K_FOTO_CONSENT);
    localStorage.removeItem(K_FOTOS_MIGRADO);
    sessionStorage.removeItem(K_SESSION);
    revogarTodosObjectURLs();
    fotosManifest.clear();
    if (fotosBackend === 'idb') {
        try { await idbClearFotos(); }
        catch (err) { console.warn('[Fotos] Falha ao limpar IndexedDB no reset:', err); }
    }
    configurarTelaAuth('signup');
}

document.getElementById('btnEntrar').addEventListener('click', handleAuth);
document.getElementById('senhaInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAuth();
});
document.getElementById('userInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('senhaInput').focus();
});
document.getElementById('btnResetAuth').addEventListener('click', resetarAcesso);

document.getElementById('toggleSenhaBtn').addEventListener('click', function() {
    const senhaInput = document.getElementById('senhaInput');
    const icon = this.querySelector('i');
    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        this.setAttribute('aria-label', 'Esconder senha');
    } else {
        senhaInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        this.setAttribute('aria-label', 'Mostrar senha');
    }
});

// Importação / Exportação de Dados
document.getElementById('btnExport').addEventListener('click', () => {
    const escopoSelect = document.getElementById('exportEscopo');
    escopoSelect.innerHTML = '<option value="all">Todos os dados (Backup Completo)</option>';
    
    if (turmas.length > 0) {
        const optGroupT = document.createElement('optgroup');
        optGroupT.label = 'Por Turma';
        turmas.forEach(t => {
            const opt = document.createElement('option');
            opt.value = `turma_${t.id}`;
            opt.textContent = `Turma: ${t.nome}`;
            optGroupT.appendChild(opt);
        });
        escopoSelect.appendChild(optGroupT);
    }
    
    if (alunos.length > 0) {
        const optGroupA = document.createElement('optgroup');
        optGroupA.label = 'Individual (Por Aluno)';
        
        const mapaTurmas = {};
        turmas.forEach(t => mapaTurmas[t.id] = t.nome);
        
        alunos.forEach(a => {
            const tNome = mapaTurmas[a.turmaId] || '?';
            const opt = document.createElement('option');
            opt.value = `aluno_${a.id}`;
            opt.textContent = `Aluno: ${a.nome} (${tNome})`;
            optGroupA.appendChild(opt);
        });
        escopoSelect.appendChild(optGroupA);
    }
    
    document.getElementById('modalExport').style.display = 'flex';
});

document.getElementById('btnCancelExport').addEventListener('click', () => {
    document.getElementById('modalExport').style.display = 'none';
});

document.getElementById('btnConfirmExport').addEventListener('click', async () => {
    const escopo = document.getElementById('exportEscopo').value;
    const formato = document.getElementById('exportFormato').value;

    let expTurmas = turmas;
    let expAlunos = alunos;
    let expAvaliacoes = avaliacoes;

    if (escopo !== 'all') {
        if (escopo.startsWith('turma_')) {
            const tId = Number(escopo.split('_')[1]);
            expTurmas = turmas.filter(t => t.id === tId);
            expAlunos = alunos.filter(a => a.turmaId === tId);
            const alunoIds = new Set(expAlunos.map(a => a.id));
            expAvaliacoes = avaliacoes.filter(av => alunoIds.has(av.alunoId));
        } else if (escopo.startsWith('aluno_')) {
            const aId = Number(escopo.split('_')[1]);
            expAlunos = alunos.filter(a => a.id === aId);
            const tId = expAlunos[0] ? expAlunos[0].turmaId : null;
            expTurmas = turmas.filter(t => t.id === tId);
            expAvaliacoes = avaliacoes.filter(av => av.alunoId === aId);
        }
    }

    if (formato === 'json') {
        // Embute fotos inline (data URL) para backups portáveis entre dispositivos.
        const expAlunosComFoto = [];
        for (const a of expAlunos) {
            let foto = null;
            if (fotosBackend === 'idb' && fotosManifest.has(a.id)) {
                try {
                    const blob = await idbGetFoto(a.id);
                    if (blob) foto = await blobParaDataUrl(blob);
                } catch (err) {
                    console.warn('[Fotos] Falha ao exportar foto do aluno', a.id, err);
                }
            } else if (typeof a.foto === 'string') {
                foto = a.foto;
            }
            expAlunosComFoto.push(foto ? { ...a, foto } : { ...a });
        }
        const data = { turmas: expTurmas, alunos: expAlunosComFoto, avaliacoes: expAvaliacoes };
        baixarArquivo(JSON.stringify(data, null, 2), 'application/json', 'json');
    } else if (formato === 'csv') {
        const csvContent = gerarCSV(expTurmas, expAlunos, expAvaliacoes);
        baixarArquivo(csvContent, 'text/csv;charset=utf-8', 'csv');
    }

    document.getElementById('modalExport').style.display = 'none';
});

function baixarArquivo(conteudo, mimeType, extensao) {
    const blob = new Blob([conteudo], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubrica_professor_${new Date().toISOString().split('T')[0]}.${extensao}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function gerarCSV(tList, aList, avList) {
    let csv = "Turma;Aluno;Data;Lição;Desempenho;Qualidade da Aula;Evolução\n";
    const mapaTurmas = {};
    tList.forEach(t => mapaTurmas[t.id] = t.nome);
    const mapaAlunos = {};
    aList.forEach(a => mapaAlunos[a.id] = { nome: a.nome, turmaId: a.turmaId });
    
    const sortedAv = [...avList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const escapeCSV = (str) => {
        if (str == null) return "";
        const s = String(str);
        if (s.includes(";") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    sortedAv.forEach(av => {
        const aluno = mapaAlunos[av.alunoId];
        if (!aluno) return;
        const turmaNome = mapaTurmas[aluno.turmaId] || "Desconhecida";
        
        const row = [
            escapeCSV(turmaNome),
            escapeCSV(aluno.nome),
            escapeCSV(av.date),
            escapeCSV(av.lesson),
            av.desempenho,
            av.aula,
            av.evolucao
        ];
        csv += row.join(";") + "\n";
    });
    
    return "\uFEFF" + csv;
}

document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('fileImport').click();
});

async function limparTodasFotos() {
    revogarTodosObjectURLs();
    fotosManifest.clear();
    if (fotosBackend === 'idb') {
        try { await idbClearFotos(); }
        catch (err) { console.warn('[Fotos] Falha ao limpar IndexedDB antes da importação:', err); }
    }
}

async function importarFotosJSON(alunosImportados) {
    if (fotosBackend !== 'idb') return; // fallback legado mantém foto inline em alunos
    for (const a of alunosImportados) {
        if (typeof a.foto !== 'string' || !a.foto.startsWith('data:image/')) continue;
        const blob = dataUrlParaBlob(a.foto);
        if (!blob) continue;
        try {
            await idbPutFoto(a.id, blob);
            fotosManifest.add(a.id);
        } catch (err) {
            console.warn('[Fotos] Falha ao importar foto do aluno', a.id, err);
        }
    }
}

document.getElementById('fileImport').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        try {
            if (isCsv) {
                await importarCSV(ev.target.result);
            } else {
                await importarJSON(ev.target.result);
            }
        } finally {
            e.target.value = ''; // Reset input
        }
    };
    reader.readAsText(file);
});

// Parser CSV simples (delimitador ';') com suporte a aspas escapadas por "".
function parseCSV(txt) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of txt) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (';' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    if (ret[ret.length - 1].length === 1 && ret[ret.length - 1][0] === '') ret.pop();
    return ret;
}

function intNoIntervalo(v, min, max, fallback) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    const inteiro = Math.round(n);
    if (inteiro < min || inteiro > max) return fallback;
    return inteiro;
}

function dataIsoValida(str) {
    if (typeof str !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str);
    return !Number.isNaN(d.getTime());
}

async function importarCSV(rawText) {
    let text = rawText;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    // 1. Parse bruto
    let rows;
    try {
        rows = parseCSV(text);
    } catch (err) {
        console.error('[Import CSV] parseCSV falhou', err);
        alert('Não foi possível interpretar o CSV. Verifique se o arquivo está íntegro e usa ";" como separador.');
        return;
    }

    // 2. Validação estrutural
    if (rows.length < 2) {
        alert('CSV vazio: é preciso pelo menos o cabeçalho + 1 linha de dados.');
        return;
    }
    const header = rows[0];
    if (header[0] !== 'Turma' || header[1] !== 'Aluno') {
        alert('Cabeçalho do CSV inválido. Esperado começar com "Turma;Aluno;..." (use um arquivo exportado por este sistema).');
        return;
    }

    if (!confirm('Atenção: A importação do CSV substituirá todos os dados atuais (incluindo fotos). Deseja continuar?')) return;

    // 3. Processamento linha a linha — erros isolados não param a importação.
    const newTurmas = [];
    const newAlunos = [];
    const newAvaliacoes = [];
    const tMap = {};
    const aMap = {};
    let nextTId = Date.now();
    let nextAId = Date.now() + 10000;
    let nextAvId = Date.now() + 20000;
    const ignoradas = [];

    for (let j = 1; j < rows.length; j++) {
        const row = rows[j];
        try {
            if (row.length < 7) { ignoradas.push(j + 1); continue; }
            const tNome = (row[0] || '').trim();
            const aNome = (row[1] || '').trim();
            const data = (row[2] || '').trim();
            if (!tNome || !aNome) { ignoradas.push(j + 1); continue; }
            if (data && !dataIsoValida(data)) { ignoradas.push(j + 1); continue; }

            let tId = tMap[tNome];
            if (!tId) { tId = nextTId++; tMap[tNome] = tId; newTurmas.push({ id: tId, nome: tNome }); }

            const aKey = tId + '_' + aNome;
            let aId = aMap[aKey];
            if (!aId) { aId = nextAId++; aMap[aKey] = aId; newAlunos.push({ id: aId, turmaId: tId, nome: aNome }); }

            newAvaliacoes.push({
                id: nextAvId++,
                alunoId: aId,
                date: data,
                lesson: (row[3] || '').trim(),
                desempenho: intNoIntervalo(row[4], 1, 4, 3),
                aula: intNoIntervalo(row[5], 1, 4, 3),
                evolucao: intNoIntervalo(row[6], 1, 4, 2)
            });
        } catch (err) {
            console.warn('[Import CSV] linha', j + 1, 'ignorada:', err);
            ignoradas.push(j + 1);
        }
    }

    if (!newAlunos.length) {
        alert('Nenhuma linha válida encontrada no CSV. Nada foi importado.');
        return;
    }

    // 4. Commit
    turmas = newTurmas; alunos = newAlunos; avaliacoes = newAvaliacoes;
    try {
        await limparTodasFotos(); // ids novos → fotos antigas virariam órfãs
    } catch (err) {
        console.warn('[Import CSV] falha ao limpar fotos antigas', err);
    }
    salvar(true); turmaAtiva = null; alunoAtivo = null;
    renderTurmas(); ocultar('secaoAlunos'); ocultar('secaoAvaliacao'); ocultar('secaoHistorico');
    renderGraficos();

    const sufixo = ignoradas.length
        ? ` (${ignoradas.length} linha(s) ignorada(s): ${ignoradas.slice(0, 10).join(', ')}${ignoradas.length > 10 ? '…' : ''})`
        : '';
    alert('CSV importado com sucesso!' + sufixo);
}

async function importarJSON(rawText) {
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (err) {
        console.error('[Import JSON] parse falhou', err);
        alert('JSON inválido. O arquivo pode estar corrompido ou ter sido editado manualmente.');
        return;
    }

    if (!Array.isArray(data.turmas) || !Array.isArray(data.alunos) || !Array.isArray(data.avaliacoes)) {
        alert('O arquivo JSON não possui o formato correto de backup (esperado: turmas, alunos, avaliacoes).');
        return;
    }

    if (!confirm('Atenção: A importação do JSON substituirá todos os dados atuais (incluindo fotos). Deseja continuar?')) return;

    try {
        turmas = data.turmas;
        avaliacoes = data.avaliacoes;
        await limparTodasFotos();
        if (fotosBackend === 'idb') {
            await importarFotosJSON(data.alunos);
            // Fotos vão pro IDB; registros não carregam o campo inline.
            alunos = data.alunos.map(a => {
                if (typeof a.foto !== 'string') return a;
                const { foto, ...rest } = a;
                return rest;
            });
            localStorage.setItem(K_FOTOS_MIGRADO, 'true');
        } else {
            alunos = data.alunos;
            alunos.forEach(a => {
                if (typeof a.foto === 'string' && a.foto.startsWith('data:image/')) fotosManifest.add(a.id);
            });
        }
        salvar(true);
        turmaAtiva = null;
        alunoAtivo = null;
        renderTurmas();
        ocultar('secaoAlunos');
        ocultar('secaoAvaliacao');
        ocultar('secaoHistorico');
        renderGraficos();
        alert('JSON importado com sucesso!');
    } catch (err) {
        console.error('[Import JSON] commit falhou', err);
        alert('Falha ao aplicar o backup. O estado atual pode estar parcial — considere recarregar e reimportar.');
    }
}

async function initApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('avalDate').value = hoje();
    carregar();
    await prepararBackendFotos();
    renderTurmas();
    renderGraficos();
    inserirBannerFotoConsent();
}

// Estado inicial: sessão ativa → app; senão, cadastro (1ª vez) ou login.
if (sessionStorage.getItem(K_SESSION) === 'true' && lerCreds()) {
    initApp();
} else {
    configurarTelaAuth(lerCreds() ? 'login' : 'signup');
}

// Tema: o toggle + persistência são geridos em ../shared/theme.js.
// Aqui só atualizamos as defaults do Chart.js e re-renderizamos os gráficos.
function aplicarTemaAosGraficos() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    Chart.defaults.color = isDark ? '#f8fafc' : '#0f172a';
    Chart.defaults.borderColor = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.15)';
}
aplicarTemaAosGraficos();

document.addEventListener('themechange', () => {
    aplicarTemaAosGraficos();
    if (sessionStorage.getItem(K_SESSION) === 'true') renderGraficos();
});

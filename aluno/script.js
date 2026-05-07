let registros = [];
let chartInstance = null;
let pendingImport = null;
let highlightedRecordId = null;
let highlightTimer = null;
let metas = [];
let materias = [];
let lastChartTrigger = null;

const STORAGE_KEY = 'portfolio_aluno_v1';
const DRAFT_KEY = 'portfolio_aluno_draft_v1';
const STUDENT_NAME_KEY = 'portfolio_aluno_nome_v1';
const CHART_PREFS_KEY = 'portfolio_aluno_chart_prefs_v1';
const SORT_KEY = 'portfolio_aluno_sort_v1';
const GOALS_KEY = 'portfolio_aluno_metas_v1';
const SUBJECTS_KEY = 'portfolio_aluno_subjects_v1';
const PRE_SUBJECTS_BACKUP_KEY = 'portfolio_aluno_backup_pre_materias_v1';
const DEFAULT_SUBJECT_NAME = 'Geral';
const CHART_TYPES = ['line', 'bar', 'horizontalBar', 'pie', 'doughnut', 'radar'];

const DESEMPENHO = {
    1: { emoji: '🔴', texto: 'Iniciante', cls: 'chip-1' },
    2: { emoji: '🟠', texto: 'Básico', cls: 'chip-2' },
    3: { emoji: '🔵', texto: 'Proficiente', cls: 'chip-3' },
    4: { emoji: '🟢', texto: 'Avançado', cls: 'chip-4' },
};
const AVALIACAO = {
    1: { emoji: '🔴', texto: 'Confusa', cls: 'chip-1' },
    2: { emoji: '🟠', texto: 'Regular', cls: 'chip-2' },
    3: { emoji: '🔵', texto: 'Boa', cls: 'chip-3' },
    4: { emoji: '🟢', texto: 'Excelente', cls: 'chip-4' },
};

const chartPrefs = carregarPreferenciasGrafico();

function $(id) {
    return document.getElementById(id);
}

function isoDiasAtras(dias) {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return isoLocal(d);
}

function isoDiasAFrente(dias) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return isoLocal(d);
}

function parseIsoLocal(iso) {
    const [y, m, d] = String(iso || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function dataIsoValida(str) {
    if (typeof str !== 'string') return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
    if (!match) return false;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function intNoIntervalo(v, min, max, fallback = null) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    const inteiro = Math.round(n);
    if (inteiro < min || inteiro > max) return fallback;
    return inteiro;
}

function gerarId() {
    return Date.now() + Math.floor(Math.random() * 100000);
}

function normalizarTexto(str, max) {
    return typeof str === 'string' ? str.trim().slice(0, max) : '';
}

function normalizarNomeMateria(str) {
    return normalizarTexto(str, 80) || DEFAULT_SUBJECT_NAME;
}

function normalizarChaveAula(nome) {
    return String(nome || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function nomesIguais(a, b) {
    return normalizarChaveAula(a) === normalizarChaveAula(b);
}

function nomeMateriaRegistro(r) {
    return normalizarNomeMateria(r?.subjectName || r?.materia || r?.subject || r?.disciplina);
}

function valoresUnicosPorNome(lista) {
    const map = new Map();
    lista.forEach(nome => {
        const limpo = normalizarTexto(nome, 100);
        if (!limpo) return;
        const key = normalizarChaveAula(limpo);
        if (!map.has(key)) map.set(key, limpo);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function normalizarRegistro(r, idFallback = gerarId()) {
    if (!r || typeof r !== 'object') return null;
    const subjectName = nomeMateriaRegistro(r);
    const lessonName = normalizarTexto(r.lessonName, 100);
    const date = normalizarTexto(r.date, 10);
    if (!lessonName || !dataIsoValida(date)) return null;

    const studentLevel = intNoIntervalo(r.studentLevel, 1, 4, 3);
    const classLevel = intNoIntervalo(r.classLevel, 1, 4, 3);
    const observation = normalizarTexto(r.observation || r.observacao, 500);

    return {
        id: Number.isFinite(Number(r.id)) ? Number(r.id) : idFallback,
        subjectName,
        lessonName,
        date,
        studentLevel,
        classLevel,
        ...(observation ? { observation } : {})
    };
}

function normalizarMeta(meta, idFallback = gerarId()) {
    if (!meta || typeof meta !== 'object') return null;
    const subjectName = normalizarTexto(meta.subjectName || meta.materia || meta.subject || meta.disciplina, 80);
    const lessonName = normalizarTexto(meta.lessonName, 100);
    const dueDate = normalizarTexto(meta.dueDate, 10);
    if (!lessonName || !dataIsoValida(dueDate)) return null;

    const targetLevel = intNoIntervalo(meta.targetLevel, 1, 4, 3);
    const doneAt = dataIsoValida(meta.doneAt) ? meta.doneAt : '';
    return {
        id: Number.isFinite(Number(meta.id)) ? Number(meta.id) : idFallback,
        ...(subjectName ? { subjectName } : {}),
        lessonName,
        dueDate,
        targetLevel,
        done: Boolean(meta.done),
        ...(doneAt ? { doneAt } : {})
    };
}

function normalizarMateria(materia, idFallback = gerarId()) {
    if (!materia) return null;
    const name = normalizarNomeMateria(
        typeof materia === 'string'
            ? materia
            : (materia.name || materia.nome || materia.subjectName || materia.materia)
    );
    if (!name) return null;

    const rawLessons = Array.isArray(materia.lessons)
        ? materia.lessons
        : (Array.isArray(materia.aulas) ? materia.aulas : []);
    const lessons = valoresUnicosPorNome(rawLessons.map(aula =>
        typeof aula === 'string' ? aula : (aula?.name || aula?.nome || aula?.lessonName)
    ));

    return {
        id: Number.isFinite(Number(materia.id)) ? Number(materia.id) : idFallback,
        name,
        active: materia.active !== false && materia.ativa !== false,
        lessons
    };
}

function materiasAtivas() {
    return materias
        .filter(m => m.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function materiaPorNome(nome) {
    const key = normalizarChaveAula(nome);
    return materias.find(m => normalizarChaveAula(m.name) === key) || null;
}

function primeiraMateriaAtiva() {
    return materiasAtivas()[0]?.name || DEFAULT_SUBJECT_NAME;
}

function mesclarMateriaNoCatalogo(materia, { reativar = false } = {}) {
    const normalizada = normalizarMateria(materia);
    if (!normalizada) return null;
    const existente = materiaPorNome(normalizada.name);
    if (existente) {
        existente.lessons = valoresUnicosPorNome([...(existente.lessons || []), ...normalizada.lessons]);
        if (reativar || normalizada.active !== false) existente.active = true;
        return existente;
    }
    materias.push(normalizada);
    return normalizada;
}

function garantirMateria(nome, { active = true, reativar = false } = {}) {
    const name = normalizarNomeMateria(nome);
    let materia = materiaPorNome(name);
    if (!materia) {
        materia = { id: gerarId(), name, active, lessons: [] };
        materias.push(materia);
        return materia;
    }
    if (reativar) materia.active = true;
    return materia;
}

function adicionarAulaAoCatalogo(subjectName, lessonName, { reativarMateria = false, apenasSeAtiva = false } = {}) {
    const aula = normalizarTexto(lessonName, 100);
    if (!aula) return false;
    const materia = garantirMateria(subjectName, { active: true, reativar: reativarMateria });
    if (apenasSeAtiva && materia.active === false) return false;
    if (!materia.lessons.some(nome => nomesIguais(nome, aula))) {
        materia.lessons.push(aula);
        materia.lessons = valoresUnicosPorNome(materia.lessons);
        return true;
    }
    return false;
}

function sincronizarCatalogoComDados({ salvarAgora = false } = {}) {
    registros.forEach(r => {
        const nome = r.subjectName || DEFAULT_SUBJECT_NAME;
        const materia = materiaPorNome(nome) || garantirMateria(nome, { active: true });
        if (materia.active !== false) adicionarAulaAoCatalogo(materia.name, r.lessonName, { apenasSeAtiva: true });
    });
    metas.forEach(meta => {
        if (meta.subjectName && !materiaPorNome(meta.subjectName)) garantirMateria(meta.subjectName, { active: true });
    });
    if (!materiasAtivas().length) garantirMateria(DEFAULT_SUBJECT_NAME, { active: true, reativar: true });
    materias = materias
        .map((m, i) => ({ ...m, id: Number.isFinite(Number(m.id)) ? Number(m.id) : Date.now() + i }))
        .sort((a, b) => Number(a.active === false) - Number(b.active === false) || a.name.localeCompare(b.name, 'pt-BR'));
    if (salvarAgora) salvarMaterias();
}

function carregarMaterias() {
    try {
        const stored = localStorage.getItem(SUBJECTS_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        const lista = Array.isArray(parsed) ? parsed : [];
        materias = [];
        lista
            .map((m, i) => normalizarMateria(m, Date.now() + i + 9000))
            .filter(Boolean)
            .forEach(m => mesclarMateriaNoCatalogo(m, { reativar: false }));
    } catch {
        materias = [];
    }
    sincronizarCatalogoComDados({ salvarAgora: true });
}

function salvarMaterias() {
    try {
        localStorage.setItem(SUBJECTS_KEY, JSON.stringify(materias));
        return true;
    } catch (err) {
        console.error('[Salvar matérias] falhou', err);
        showToast('Não foi possível salvar matérias e aulas. Exporte um backup e libere espaço no navegador.', { type: 'error', duration: 9000 });
        return false;
    }
}

function carregarPreferenciasGrafico() {
    try {
        const raw = localStorage.getItem(CHART_PREFS_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        const startDate = dataIsoValida(parsed.startDate)
            ? parsed.startDate
            : (['30', '90'].includes(parsed.period) ? isoDiasAtras(Number(parsed.period) - 1) : '');
        return {
            startDate,
            endDate: dataIsoValida(parsed.endDate) ? parsed.endDate : '',
            chartType: CHART_TYPES.includes(parsed.chartType) ? parsed.chartType : 'line',
            showDesempenho: parsed.showDesempenho !== false,
            showAula: parsed.showAula !== false,
            selectedSubjects: Array.isArray(parsed.selectedSubjects) ? parsed.selectedSubjects.map(normalizarNomeMateria) : null,
            selectedLessons: Array.isArray(parsed.selectedLessons) ? parsed.selectedLessons.map(nome => normalizarTexto(nome, 100)).filter(Boolean) : null
        };
    } catch {
        return { startDate: '', endDate: '', chartType: 'line', showDesempenho: true, showAula: true, selectedSubjects: null, selectedLessons: null };
    }
}

function salvarPreferenciasGrafico() {
    localStorage.setItem(CHART_PREFS_KEY, JSON.stringify(chartPrefs));
}

function carregar() {
    let precisaMigrar = false;
    let stored = '';
    try {
        stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        const lista = Array.isArray(parsed) ? parsed : [];
        const ids = new Set();
        registros = lista
            .map((r, i) => {
                if (r && typeof r === 'object' && !normalizarTexto(r.subjectName || r.materia || r.subject || r.disciplina, 80)) {
                    precisaMigrar = true;
                }
                return normalizarRegistro(r, Date.now() + i);
            })
            .filter(Boolean)
            .map(r => {
                if (ids.has(r.id)) r.id = gerarId();
                ids.add(r.id);
                return r;
            });
    } catch {
        registros = [];
    }
    sortByDate(registros);
    if (precisaMigrar && registros.length) {
        try {
            if (stored && !localStorage.getItem(PRE_SUBJECTS_BACKUP_KEY)) {
                localStorage.setItem(PRE_SUBJECTS_BACKUP_KEY, stored);
            }
        } catch (err) {
            console.info('[Migração] backup pré-matérias não salvo', err);
        }
        salvar();
    }
}

function carregarMetas() {
    try {
        const stored = localStorage.getItem(GOALS_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        const lista = Array.isArray(parsed) ? parsed : [];
        const ids = new Set();
        metas = lista
            .map((meta, i) => normalizarMeta(meta, Date.now() + i + 5000))
            .filter(Boolean)
            .map(meta => {
                if (ids.has(meta.id)) meta.id = gerarId();
                ids.add(meta.id);
                return meta;
            });
    } catch {
        metas = [];
    }
}

function salvar() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
        return true;
    } catch (err) {
        console.error('[Salvar] falhou', err);
        showToast('Não foi possível salvar. Exporte um backup e libere espaço no navegador.', { type: 'error', duration: 9000 });
        return false;
    }
}

function salvarMetas() {
    try {
        localStorage.setItem(GOALS_KEY, JSON.stringify(metas));
        return true;
    } catch (err) {
        console.error('[Salvar metas] falhou', err);
        showToast('Não foi possível salvar as metas. Exporte seus registros e libere espaço no navegador.', { type: 'error', duration: 9000 });
        return false;
    }
}

function setNivel(targetId, value, { salvarRascunhoAgora = true } = {}) {
    const input = $(targetId);
    input.value = value ? String(value) : '';
    document.querySelectorAll(`.level-choice[data-target="${targetId}"]`).forEach(btn => {
        btn.setAttribute('aria-pressed', btn.dataset.value === String(value));
    });
    const field = document.querySelector(`.chip-field[data-field="${targetId}"]`);
    if (field) field.classList.remove('is-invalid');
    const error = $(`${targetId}Error`);
    if (error) error.textContent = '';
    if (salvarRascunhoAgora) salvarRascunho();
}

function limparErros() {
    ['subjectSelect', 'lessonName', 'lessonDate'].forEach(id => {
        $(id).classList.remove('is-invalid');
        const error = $(`${id}Error`);
        if (error) error.textContent = '';
    });
    ['studentLevel', 'classLevel'].forEach(id => {
        const field = document.querySelector(`.chip-field[data-field="${id}"]`);
        if (field) field.classList.remove('is-invalid');
        const error = $(`${id}Error`);
        if (error) error.textContent = '';
    });
}

function validarForm() {
    limparErros();
    const erros = [];
    const subjectName = $('subjectSelect').value.trim();
    const lessonName = $('lessonName').value.trim();
    const date = $('lessonDate').value;
    const studentLevel = $('studentLevel').value;
    const classLevel = $('classLevel').value;

    if (!subjectName) {
        erros.push({ id: 'subjectSelect', msg: 'Escolha uma matéria.' });
    } else if (!materiaPermitidaNoFormulario(subjectName)) {
        erros.push({ id: 'subjectSelect', msg: 'Essa matéria foi excluída. Escolha uma matéria ativa.' });
    }
    if (!lessonName) {
        erros.push({ id: 'lessonName', msg: 'Informe o nome da aula.' });
    }
    if (!date) {
        erros.push({ id: 'lessonDate', msg: 'Selecione a data.' });
    } else if (!dataIsoValida(date)) {
        erros.push({ id: 'lessonDate', msg: 'Use uma data válida.' });
    }
    if (!studentLevel) {
        erros.push({ id: 'studentLevel', msg: 'Escolha seu desempenho.' });
    }
    if (!classLevel) {
        erros.push({ id: 'classLevel', msg: 'Avalie como foi a aula.' });
    }

    erros.forEach(erro => {
        const input = $(erro.id);
        const error = $(`${erro.id}Error`);
        if (input) input.classList.add('is-invalid');
        if (error) error.textContent = erro.msg;
        const field = document.querySelector(`.chip-field[data-field="${erro.id}"]`);
        if (field) field.classList.add('is-invalid');
    });

    if (erros.length) {
        const primeiro = erros[0].id;
        const foco = ['studentLevel', 'classLevel'].includes(primeiro)
            ? document.querySelector(`.level-choice[data-target="${primeiro}"]`)
            : $(primeiro);
        if (foco) foco.focus();
        return false;
    }
    return true;
}

function dadosDoForm() {
    return {
        subjectName: $('subjectSelect').value.trim(),
        lessonName: $('lessonName').value.trim(),
        date: $('lessonDate').value,
        studentLevel: Number($('studentLevel').value),
        classLevel: Number($('classLevel').value),
        observation: $('observation').value.trim().slice(0, 500)
    };
}

function registroDuplicadoManual(dados, ignoreId = null) {
    const materia = normalizarChaveAula(dados.subjectName || DEFAULT_SUBJECT_NAME);
    const aula = normalizarChaveAula(dados.lessonName);
    return registros.find(r =>
        r.id !== ignoreId &&
        r.date === dados.date &&
        normalizarChaveAula(r.subjectName || DEFAULT_SUBJECT_NAME) === materia &&
        normalizarChaveAula(r.lessonName) === aula
    );
}

function registrosDaMeta(meta) {
    const materia = normalizarChaveAula(meta.subjectName || '');
    const aula = normalizarChaveAula(meta.lessonName);
    return registros.filter(r => {
        const mesmaMateria = !materia || normalizarChaveAula(r.subjectName || DEFAULT_SUBJECT_NAME) === materia;
        return mesmaMateria && normalizarChaveAula(r.lessonName) === aula && r.date <= meta.dueDate;
    });
}

function progressoMeta(meta) {
    const relacionados = registrosDaMeta(meta);
    const maiorNivel = relacionados.length ? Math.max(...relacionados.map(r => r.studentLevel)) : 0;
    const percent = Math.min(100, Math.round((maiorNivel / meta.targetLevel) * 100));
    const ultimo = relacionados.sort((a, b) => parseIsoLocal(b.date) - parseIsoLocal(a.date))[0] || null;
    return {
        maiorNivel,
        percent,
        count: relacionados.length,
        ultimo,
        atingida: maiorNivel >= meta.targetLevel
    };
}

function avaliarMetasAtingidas() {
    const mensagens = [];
    let alterou = false;
    metas.forEach(meta => {
        const progresso = progressoMeta(meta);
        if (!meta.done && progresso.atingida) {
            meta.done = true;
            meta.doneAt = isoLocal();
            alterou = true;
            mensagens.push(`Meta atingida: ${meta.lessonName} chegou ao nível ${meta.targetLevel}.`);
        } else if (meta.done && !progresso.atingida) {
            meta.done = false;
            delete meta.doneAt;
            alterou = true;
        }
    });
    if (alterou) salvarMetas();
    return mensagens;
}

function validarMetaForm() {
    $('goalError').textContent = '';
    ['goalLesson', 'goalDate'].forEach(id => $(id).classList.remove('is-invalid'));

    const subjectName = $('goalSubject').value.trim();
    const lessonName = $('goalLesson').value.trim();
    const dueDate = $('goalDate').value;
    const targetLevel = Number($('goalLevel').value);

    if (!lessonName) {
        $('goalLesson').classList.add('is-invalid');
        $('goalError').textContent = 'Informe a aula ou assunto da meta.';
        $('goalLesson').focus();
        return null;
    }
    if (!dataIsoValida(dueDate)) {
        $('goalDate').classList.add('is-invalid');
        $('goalError').textContent = 'Escolha uma data limite válida.';
        $('goalDate').focus();
        return null;
    }
    if (!intNoIntervalo(targetLevel, 1, 4, null)) {
        $('goalError').textContent = 'Escolha um nível de meta válido.';
        $('goalLevel').focus();
        return null;
    }

    return { ...(subjectName ? { subjectName } : {}), lessonName, dueDate, targetLevel };
}

function adicionarMeta() {
    const dados = validarMetaForm();
    if (!dados) return;
    const duplicada = metas.find(meta =>
        !meta.done &&
        meta.targetLevel === dados.targetLevel &&
        meta.dueDate === dados.dueDate &&
        normalizarChaveAula(meta.subjectName || '') === normalizarChaveAula(dados.subjectName || '') &&
        normalizarChaveAula(meta.lessonName) === normalizarChaveAula(dados.lessonName)
    );
    if (duplicada) {
        showToast('Essa meta já está ativa.', { type: 'warning' });
        return;
    }

    const meta = { id: gerarId(), ...dados, done: false };
    metas.push(meta);
    const mensagens = avaliarMetasAtingidas();
    if (!salvarMetas()) return;
    $('goalForm').reset();
    $('goalSubject').value = '';
    $('goalLevel').value = '3';
    $('goalDate').value = isoDiasAFrente(30);
    atualizarSugestoesAula();
    renderMetas();
    showToast(mensagens.length ? `Meta adicionada. ${mensagens.join(' ')}` : 'Meta adicionada.', { type: 'success', duration: 6000 });
}

function excluirMeta(id) {
    const idx = metas.findIndex(meta => meta.id === id);
    if (idx === -1) return;
    const removida = metas[idx];
    metas.splice(idx, 1);
    salvarMetas();
    renderMetas();
    showToast('Meta removida.', {
        type: 'warning',
        actionLabel: 'Desfazer',
        duration: 6000,
        onAction: () => {
            metas.splice(Math.min(idx, metas.length), 0, removida);
            salvarMetas();
            renderMetas();
            showToast('Meta restaurada.', { type: 'success' });
        }
    });
}

function preencherForm(r, { preservarMateria = false } = {}) {
    $('editId').value = r?.id || '';
    const preservada = preservarMateria ? $('subjectSelect').value : '';
    const materiaAtual = materiaPorNome(preservada)?.active === false ? '' : preservada;
    renderSubjectSelect(r?.subjectName || materiaAtual || primeiraMateriaAtiva());
    $('lessonName').value = r?.lessonName || '';
    $('lessonDate').value = r?.date || isoLocal();
    $('observation').value = r?.observation || '';
    setNivel('studentLevel', r?.studentLevel || '', { salvarRascunhoAgora: false });
    setNivel('classLevel', r?.classLevel || '', { salvarRascunhoAgora: false });
    $('btnSalvar').innerHTML = r?.id ? '<i class="fas fa-pen"></i> Atualizar' : '<i class="fas fa-save"></i> Salvar';
    $('btnCancelar').hidden = !r?.id;
    atualizarContadores();
    renderResumoMaterias();
    atualizarSugestoesAula();
}

function limparForm() {
    preencherForm(null, { preservarMateria: true });
    limparErros();
    sessionStorage.removeItem(DRAFT_KEY);
}

function salvarRascunho() {
    const draft = {
        editId: $('editId').value,
        subjectName: $('subjectSelect').value,
        lessonName: $('lessonName').value,
        date: $('lessonDate').value,
        studentLevel: $('studentLevel').value,
        classLevel: $('classLevel').value,
        observation: $('observation').value
    };
    const temConteudo = draft.lessonName.trim() || draft.studentLevel || draft.classLevel || draft.observation.trim() || draft.editId;
    if (!temConteudo) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function restaurarRascunho() {
    try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw);
        $('editId').value = draft.editId || '';
        renderSubjectSelect(draft.subjectName || primeiraMateriaAtiva());
        $('lessonName').value = draft.lessonName || '';
        $('lessonDate').value = draft.date || isoLocal();
        $('observation').value = draft.observation || '';
        setNivel('studentLevel', draft.studentLevel || '', { salvarRascunhoAgora: false });
        setNivel('classLevel', draft.classLevel || '', { salvarRascunhoAgora: false });
        $('btnSalvar').innerHTML = draft.editId ? '<i class="fas fa-pen"></i> Atualizar' : '<i class="fas fa-save"></i> Salvar';
        $('btnCancelar').hidden = !draft.editId;
        atualizarContadores();
        renderResumoMaterias();
        atualizarSugestoesAula();
    } catch {
        sessionStorage.removeItem(DRAFT_KEY);
    }
}

function adicionarRegistro(dados) {
    const duplicado = registroDuplicadoManual(dados);
    if (duplicado) {
        focarRegistroExistente(duplicado);
        showToast(`Já existe registro para "${duplicado.lessonName}" em ${formatarData(duplicado.date)}. Edite o registro existente ou altere a data.`, { type: 'warning', duration: 8000 });
        return;
    }

    registros.push({
        id: gerarId(),
        subjectName: dados.subjectName,
        lessonName: dados.lessonName,
        date: dados.date,
        studentLevel: dados.studentLevel,
        classLevel: dados.classLevel,
        ...(dados.observation ? { observation: dados.observation } : {})
    });
    adicionarAulaAoCatalogo(dados.subjectName, dados.lessonName, { apenasSeAtiva: true });
    sortByDate(registros);
    salvarMaterias();
    if (!salvar()) return;
    const metaMsgs = avaliarMetasAtingidas();
    limparForm();
    renderizar();
    const marco = mensagemMarcoSeHouver();
    showToast([marco || 'Registro salvo.', ...metaMsgs].join(' '), { type: 'success', duration: metaMsgs.length ? 7000 : 4200 });
}

function atualizarRegistro(id, dados) {
    const idx = registros.findIndex(r => r.id === id);
    if (idx === -1) return;
    const duplicado = registroDuplicadoManual(dados, id);
    if (duplicado) {
        focarRegistroExistente(duplicado);
        showToast(`Já existe outro registro para "${duplicado.lessonName}" em ${formatarData(duplicado.date)}.`, { type: 'warning', duration: 8000 });
        return;
    }

    registros[idx] = {
        ...registros[idx],
        subjectName: dados.subjectName,
        lessonName: dados.lessonName,
        date: dados.date,
        studentLevel: dados.studentLevel,
        classLevel: dados.classLevel,
        ...(dados.observation ? { observation: dados.observation } : {})
    };
    if (!dados.observation) delete registros[idx].observation;
    adicionarAulaAoCatalogo(dados.subjectName, dados.lessonName, { apenasSeAtiva: true });
    sortByDate(registros);
    salvarMaterias();
    if (!salvar()) return;
    const metaMsgs = avaliarMetasAtingidas();
    limparForm();
    renderizar();
    showToast(['Registro atualizado.', ...metaMsgs].join(' '), { type: 'success', duration: metaMsgs.length ? 7000 : 4200 });
}

function excluirRegistro(id) {
    const idx = registros.findIndex(r => r.id === id);
    if (idx === -1) return;
    const removido = registros[idx];
    registros.splice(idx, 1);
    if ($('editId').value === String(id)) limparForm();
    salvar();
    avaliarMetasAtingidas();
    renderizar();
    showToast('Registro removido.', {
        type: 'warning',
        actionLabel: 'Desfazer',
        duration: 6000,
        onAction: () => {
            registros.splice(Math.min(idx, registros.length), 0, removido);
            sortByDate(registros);
            salvar();
            avaliarMetasAtingidas();
            renderizar();
            showToast('Registro restaurado.', { type: 'success' });
        }
    });
}

function editarRegistro(id) {
    const r = registros.find(reg => reg.id === id);
    if (!r) return;
    preencherForm(r);
    salvarRascunho();
    renderizarLista();
    $('formCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('lessonName').focus();
}

function focarRegistroExistente(registro) {
    highlightedRecordId = registro.id;
    clearTimeout(highlightTimer);
    $('filtroMateria').value = registro.subjectName || DEFAULT_SUBJECT_NAME;
    $('filtroAula').value = registro.lessonName;
    $('filtroData').value = registro.date;
    renderizarLista();

    requestAnimationFrame(() => {
        const item = document.querySelector(`[data-record-id="${registro.id}"]`);
        if (!item) return;
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.focus({ preventScroll: true });
        highlightTimer = setTimeout(() => {
            highlightedRecordId = null;
            item.classList.remove('duplicate-highlight');
        }, 4500);
    });
}

function getRegistrosFiltrados() {
    let lista = [...registros];
    const materia = $('filtroMateria').value.trim();
    const termo = $('filtroAula').value.trim().toLowerCase();
    const data = $('filtroData').value;
    const sort = $('sortHistorico').value;

    if (materia) lista = lista.filter(r => nomesIguais(r.subjectName || DEFAULT_SUBJECT_NAME, materia));
    if (termo) lista = lista.filter(r => r.lessonName.toLowerCase().includes(termo));
    if (data) lista = lista.filter(r => r.date === data);

    const byDate = (a, b) => parseIsoLocal(a.date).getTime() - parseIsoLocal(b.date).getTime();
    lista.sort((a, b) => {
        if (sort === 'oldest') return byDate(a, b);
        if (sort === 'performance-desc') return b.studentLevel - a.studentLevel || byDate(b, a);
        if (sort === 'performance-asc') return a.studentLevel - b.studentLevel || byDate(b, a);
        if (sort === 'name') return (a.subjectName || DEFAULT_SUBJECT_NAME).localeCompare(b.subjectName || DEFAULT_SUBJECT_NAME, 'pt-BR') || a.lessonName.localeCompare(b.lessonName, 'pt-BR') || byDate(b, a);
        return byDate(b, a);
    });
    return lista;
}

function textoOrdenacao() {
    const sort = $('sortHistorico').value;
    const mapa = {
        recent: 'Mostrando registros mais recentes primeiro.',
        oldest: 'Mostrando registros mais antigos primeiro.',
        'performance-desc': 'Mostrando maior desempenho primeiro.',
        'performance-asc': 'Mostrando menor desempenho primeiro.',
        name: 'Mostrando em ordem alfabética por matéria e aula.'
    };
    const filtros = [];
    if ($('filtroMateria').value.trim()) filtros.push('matéria');
    if ($('filtroAula').value.trim()) filtros.push('aula');
    if ($('filtroData').value) filtros.push('data');
    return mapa[sort] + (filtros.length ? ` Filtro ativo: ${filtros.join(' e ')}.` : '');
}

function renderizarLista() {
    const container = $('listaRegistros');
    const lista = getRegistrosFiltrados();
    $('historyHint').textContent = textoOrdenacao();
    atualizarOpcaoExportFiltros();

    if (!registros.length) {
        container.innerHTML = '<div class="empty-message"><i class="fas fa-clipboard-list"></i><br>Nenhum registro ainda.<br><button type="button" class="btn btn-primary btn-sm" id="btnPrimeiroRegistro">Registrar primeira aula</button></div>';
        return;
    }
    if (!lista.length) {
        container.innerHTML = '<div class="empty-message"><i class="fas fa-search"></i><br>Nenhum registro encontrado com esses filtros.</div>';
        return;
    }

    const editId = Number($('editId').value);
    container.innerHTML = lista.map(r => {
        const d = DESEMPENHO[r.studentLevel] || DESEMPENHO[1];
        const a = AVALIACAO[r.classLevel] || AVALIACAO[1];
        const editing = r.id === editId;
        const highlighted = r.id === highlightedRecordId;
        const obs = r.observation
            ? `<details class="registro-observacao"><summary>Observação</summary><p>${escapeHtml(r.observation)}</p></details>`
            : '';
        return `
        <article class="registro-item${editing ? ' editing' : ''}${highlighted ? ' duplicate-highlight' : ''}" data-record-id="${r.id}" tabindex="-1">
            <div class="registro-header">
                <span class="registro-nome registro-main"><span class="registro-subject"><i class="fas fa-layer-group"></i> ${escapeHtml(r.subjectName || DEFAULT_SUBJECT_NAME)}</span><span><i class="fas fa-chalkboard" style="color:#3b82f6;margin-right:5px;"></i>${escapeHtml(r.lessonName)}</span>${editing ? '<span class="edit-label"><i class="fas fa-pen"></i> Editando</span>' : ''}</span>
                <span class="registro-data"><i class="far fa-calendar"></i> ${formatarData(r.date)}</span>
            </div>
            <div class="niveis-info">
                <span class="nivel-chip ${d.cls}"><i class="fas fa-user-graduate"></i> ${d.emoji} ${d.texto}</span>
                <span class="nivel-chip ${a.cls}"><i class="fas fa-chalkboard-user"></i> ${a.emoji} ${a.texto}</span>
            </div>
            ${obs}
            <div class="acoes">
                <button class="btn-edit" data-id="${r.id}" type="button"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-del" data-id="${r.id}" type="button"><i class="fas fa-trash-alt"></i> Excluir</button>
            </div>
        </article>`;
    }).join('');
}

function registrosPorPeriodo(period, origem = registros) {
    if (period === 'all') return [...origem];
    const cutoff = isoDiasAtras(Number(period) - 1);
    return origem.filter(r => r.date >= cutoff);
}

function media(lista, campo) {
    if (!lista.length) return null;
    return lista.reduce((s, r) => s + r[campo], 0) / lista.length;
}

function tendencia(campo) {
    const minimo = 8;
    if (registros.length < minimo) {
        const faltam = minimo - registros.length;
        return { texto: `Faltam ${faltam} registro${faltam > 1 ? 's' : ''}`, cls: '' };
    }
    const ordenados = sortByDate([...registros]);
    const ultimos = ordenados.slice(-5);
    const anteriores = ordenados.slice(-10, -5);
    const delta = media(ultimos, campo) - media(anteriores, campo);
    if (Math.abs(delta) < 0.05) return { texto: 'Estável', cls: '' };
    return {
        texto: `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)} vs 5 anteriores`,
        cls: delta > 0 ? 'trend-up' : 'trend-down'
    };
}

function calcularStreak() {
    if (!registros.length) return 'Sem sequência';
    const datas = [...new Set(registros.map(r => r.date))].sort().reverse();
    let atual = isoLocal();
    let count = 0;
    for (const data of datas) {
        if (data === atual) {
            count++;
            const d = parseIsoLocal(atual);
            d.setDate(d.getDate() - 1);
            atual = isoLocal(d);
        } else if (!count && data < atual) {
            return `Último: ${formatarData(data)}`;
        } else {
            break;
        }
    }
    return count > 1 ? `${count} dias seguidos` : (count === 1 ? 'Registrou hoje' : `Último: ${formatarData(datas[0])}`);
}

function atualizarEstatisticas() {
    const total = registros.length;
    $('totalRegistros').textContent = total;

    if (!total) {
        $('mediaDesempenho').textContent = '—';
        $('mediaAula').textContent = '—';
        $('tendenciaDesempenho').textContent = 'Sem tendência';
        $('tendenciaAula').textContent = 'Sem tendência';
        $('streakInfo').textContent = 'Sem sequência';
    } else {
        $('mediaDesempenho').textContent = media(registros, 'studentLevel').toFixed(1);
        $('mediaAula').textContent = media(registros, 'classLevel').toFixed(1);
        const tDes = tendencia('studentLevel');
        const tAula = tendencia('classLevel');
        $('tendenciaDesempenho').textContent = tDes.texto;
        $('tendenciaDesempenho').className = `stat-trend ${tDes.cls}`;
        $('tendenciaAula').textContent = tAula.texto;
        $('tendenciaAula').className = `stat-trend ${tAula.cls}`;
        $('streakInfo').textContent = calcularStreak();
    }

    renderGrafico();
}

function labelCurtoData(iso) {
    const [y, m, d] = iso.split('-');
    return y ? `${d}/${m}` : iso;
}

function renderPrintChart(regs, showDesempenho, showAula) {
    const el = $('printChart');
    if (!regs.length || (!showDesempenho && !showAula)) {
        el.innerHTML = '<p class="empty-message">Sem dados para imprimir neste período.</p>';
        return;
    }

    const width = 760;
    const height = 280;
    const left = 54;
    const right = 24;
    const top = 24;
    const bottom = 46;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const x = i => left + (regs.length === 1 ? plotW / 2 : (i / (regs.length - 1)) * plotW);
    const y = v => top + ((4.5 - v) / 4) * plotH;
    const points = campo => regs.map((r, i) => `${x(i).toFixed(1)},${y(r[campo]).toFixed(1)}`).join(' ');
    const circles = (campo, color) => regs.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r[campo]).toFixed(1)}" r="4" fill="${color}" />`).join('');
    const xLabels = regs.map((r, i) => {
        if (regs.length > 8 && i % Math.ceil(regs.length / 8) !== 0 && i !== regs.length - 1) return '';
        return `<text x="${x(i).toFixed(1)}" y="${height - 18}" text-anchor="middle" font-size="10">${escapeHtml(labelCurtoData(r.date))}</text>`;
    }).join('');
    const yLabels = [1, 2, 3, 4].map(v => {
        const py = y(v).toFixed(1);
        return `<line x1="${left}" y1="${py}" x2="${width - right}" y2="${py}" stroke="#e5e7eb" /><text x="${left - 10}" y="${Number(py) + 4}" text-anchor="end" font-size="10">${v}</text>`;
    }).join('');
    const desempenho = showDesempenho
        ? `<polyline points="${points('studentLevel')}" fill="none" stroke="#2563eb" stroke-width="3" />${circles('studentLevel', '#2563eb')}`
        : '';
    const aula = showAula
        ? `<polyline points="${points('classLevel')}" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="${showDesempenho ? '7 5' : ''}" />${circles('classLevel', '#16a34a')}`
        : '';
    const legend = [
        showDesempenho ? '<text x="54" y="16" font-size="11"><tspan fill="#2563eb">■</tspan> Desempenho</text>' : '',
        showAula ? `<text x="${showDesempenho ? 150 : 54}" y="16" font-size="11"><tspan fill="#16a34a">■</tspan> Aula</text>` : ''
    ].join('');

    el.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico imprimível de evolução">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#fff" />
        ${legend}
        ${yLabels}
        <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" stroke="#9ca3af" />
        <line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}" stroke="#9ca3af" />
        ${desempenho}
        ${aula}
        ${xLabels}
    </svg>`;
}

function valoresCheckboxes(containerId) {
    return [...$(containerId).querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
}

function todasMateriasParaFiltro() {
    const map = new Map();
    materias.forEach(m => {
        const key = normalizarChaveAula(m.name);
        if (!map.has(key)) map.set(key, { name: m.name, active: m.active !== false });
        else if (m.active !== false) map.get(key).active = true;
    });
    registros.forEach(r => {
        const name = r.subjectName || DEFAULT_SUBJECT_NAME;
        const key = normalizarChaveAula(name);
        if (!map.has(key)) map.set(key, { name, active: false });
    });
    return [...map.values()].sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
    });
}

function aulasParaFiltro(subjectNames) {
    const keys = new Set(subjectNames.map(normalizarChaveAula));
    if (!keys.size) return [];
    const nomes = [];
    materias.forEach(m => {
        if (keys.has(normalizarChaveAula(m.name))) nomes.push(...(m.lessons || []));
    });
    registros.forEach(r => {
        if (keys.has(normalizarChaveAula(r.subjectName || DEFAULT_SUBJECT_NAME))) nomes.push(r.lessonName);
    });
    return valoresUnicosPorNome(nomes);
}

function selecionadosPorPreferencia(todos, selecionados) {
    if (selecionados === null) return todos;
    const keys = new Set(todos.map(normalizarChaveAula));
    return selecionados.filter(nome => keys.has(normalizarChaveAula(nome)));
}

function renderCheckboxes(containerId, options, selected, emptyMessage, renderLabel = nome => escapeHtml(nome)) {
    const container = $(containerId);
    if (!options.length) {
        container.innerHTML = `<div class="empty-inline">${emptyMessage}</div>`;
        return;
    }
    const selectedKeys = new Set(selected.map(normalizarChaveAula));
    container.innerHTML = options.map(option => {
        const value = typeof option === 'string' ? option : option.name;
        const checked = selectedKeys.has(normalizarChaveAula(value)) ? ' checked' : '';
        return `<label><input type="checkbox" value="${escapeHtml(value)}"${checked}> <span>${renderLabel(option)}</span></label>`;
    }).join('');
}

function renderChartFilterOptions() {
    const subjectOptions = todasMateriasParaFiltro();
    const allSubjects = subjectOptions.map(option => option.name);
    const selectedSubjects = selecionadosPorPreferencia(allSubjects, chartPrefs.selectedSubjects);

    renderCheckboxes(
        'chartSubjectFilters',
        subjectOptions,
        selectedSubjects,
        'Nenhuma matéria disponível.',
        option => `${escapeHtml(option.name)}${option.active ? '' : ' <small>(excluída)</small>'}`
    );

    const lessonOptions = aulasParaFiltro(selectedSubjects);
    const selectedLessons = selecionadosPorPreferencia(lessonOptions, chartPrefs.selectedLessons);
    renderCheckboxes(
        'chartLessonFilters',
        lessonOptions,
        selectedLessons,
        selectedSubjects.length ? 'Nenhuma aula encontrada para as matérias escolhidas.' : 'Selecione ao menos uma matéria.'
    );

    chartPrefs.selectedSubjects = chartPrefs.selectedSubjects === null ? null : selectedSubjects;
    chartPrefs.selectedLessons = chartPrefs.selectedLessons === null ? null : selectedLessons;
    atualizarResumoFiltrosGrafico();
}

function registrosFiltradosGrafico() {
    let lista = sortByDate([...registros]);
    const subjects = valoresCheckboxes('chartSubjectFilters');
    const lessons = valoresCheckboxes('chartLessonFilters');
    const lessonOptions = aulasParaFiltro(subjects);
    const startDate = $('chartStartDate').value;
    const endDate = $('chartEndDate').value;

    if (todasMateriasParaFiltro().length && !subjects.length) return [];
    const subjectKeys = new Set(subjects.map(normalizarChaveAula));
    if (subjectKeys.size) {
        lista = lista.filter(r => subjectKeys.has(normalizarChaveAula(r.subjectName || DEFAULT_SUBJECT_NAME)));
    }

    if (lessonOptions.length && !lessons.length) return [];
    const lessonKeys = new Set(lessons.map(normalizarChaveAula));
    if (lessonKeys.size) lista = lista.filter(r => lessonKeys.has(normalizarChaveAula(r.lessonName)));
    if (dataIsoValida(startDate)) lista = lista.filter(r => r.date >= startDate);
    if (dataIsoValida(endDate)) lista = lista.filter(r => r.date <= endDate);
    return lista;
}

function mensagemGraficoVazio() {
    if (!registros.length) return '<i class="fas fa-chart-line"></i><br>Registre uma aula para ver sua evolução.';
    if (!valoresCheckboxes('chartSubjectFilters').length) return '<i class="fas fa-layer-group"></i><br>Selecione ao menos uma matéria.';
    if (aulasParaFiltro(valoresCheckboxes('chartSubjectFilters')).length && !valoresCheckboxes('chartLessonFilters').length) {
        return '<i class="fas fa-book-open"></i><br>Selecione ao menos uma aula.';
    }
    return '<i class="fas fa-search"></i><br>Nenhum registro encontrado com esses filtros.';
}

function atualizarResumoBotaoGrafico(regs) {
    const hint = $('chartLauncherHint');
    if (!hint) return;
    if (!registros.length) {
        hint.textContent = 'Registre uma aula para abrir a visualização interativa.';
    } else if (!regs.length) {
        hint.textContent = 'Os filtros atuais não encontram registros. Abra o gráfico para ajustar.';
    } else {
        const datas = regs.map(r => r.date).sort();
        const intervalo = datas[0] === datas[datas.length - 1]
            ? formatarData(datas[0])
            : `${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])}`;
        hint.textContent = `${regs.length} registro(s) no gráfico atual, de ${intervalo}.`;
    }
}

function atualizarResumoFiltrosGrafico() {
    const summary = $('chartFilterSummary');
    if (!summary) return;
    const regs = registrosFiltradosGrafico();
    const subjects = valoresCheckboxes('chartSubjectFilters').length;
    const lessons = valoresCheckboxes('chartLessonFilters').length;
    summary.textContent = `${regs.length} registro(s) selecionado(s). ${subjects} matéria(s), ${lessons} aula(s).`;
}

function labelRegistroGrafico(r) {
    return `${labelCurtoData(r.date)} · ${r.lessonName}`;
}

function datasetEvolucao(label, data, color, background, extra = {}) {
    return {
        label,
        data,
        borderColor: color,
        backgroundColor: background,
        borderWidth: 2.5,
        tension: 0.25,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBorderColor: 'white',
        ...extra
    };
}

function escalaNivel(axis = 'y') {
    return {
        [axis]: {
            min: 0.5,
            max: 4.5,
            ticks: {
                stepSize: 1,
                font: { size: 10 },
                callback: v => ({ 1: '1', 2: '2', 3: '3', 4: '4' }[v] || '')
            },
            title: { display: true, text: 'Nível', font: { size: 10 } }
        }
    };
}

function opcoesBaseGrafico(regs, chartType) {
    const horizontal = chartType === 'horizontalBar';
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        scales: {
            ...(horizontal ? escalaNivel('x') : escalaNivel('y')),
            [horizontal ? 'y' : 'x']: { ticks: { maxRotation: horizontal ? 0 : 35, autoSkip: true, font: { size: 10 } } }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    title: items => {
                        const idx = items[0]?.dataIndex;
                        return regs[idx] ? `${formatarData(regs[idx].date)} · ${regs[idx].subjectName || DEFAULT_SUBJECT_NAME} · ${regs[idx].lessonName}` : '';
                    },
                    label: ctx => {
                        const mapa = ctx.dataset.label === 'Meu desempenho' ? DESEMPENHO : AVALIACAO;
                        const d = mapa[ctx.raw];
                        return d ? ` ${ctx.dataset.label}: ${d.emoji} Nível ${ctx.raw} - ${d.texto}` : ` Nível ${ctx.raw}`;
                    }
                }
            },
            legend: { labels: { font: { size: 11 }, boxWidth: 12 } }
        }
    };
}

function criarConfigEvolucao(chartType, regs, showDesempenho, showAula) {
    const labels = regs.map(labelRegistroGrafico);
    const datasets = [];
    const baseType = chartType === 'line' ? 'line' : 'bar';
    const lineMode = chartType === 'line';
    if (showDesempenho) {
        datasets.push(datasetEvolucao(
            'Meu desempenho',
            regs.map(r => r.studentLevel),
            '#3b82f6',
            lineMode ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.72)',
            {
                fill: lineMode,
                pointBackgroundColor: regs.map(r => corPontoNivel(r.studentLevel))
            }
        ));
    }
    if (showAula) {
        datasets.push(datasetEvolucao(
            'Como foi a aula',
            regs.map(r => r.classLevel),
            '#16a34a',
            lineMode ? 'rgba(22,163,74,0.08)' : 'rgba(22,163,74,0.68)',
            {
                fill: lineMode && !showDesempenho,
                borderDash: lineMode && showDesempenho ? [6, 4] : [],
                pointBackgroundColor: regs.map(r => corPontoNivel(r.classLevel))
            }
        ));
    }
    return {
        type: baseType,
        data: { labels, datasets },
        options: opcoesBaseGrafico(regs, chartType)
    };
}

function criarConfigDistribuicao(chartType, regs, showDesempenho, showAula) {
    const counts = [0, 0, 0, 0];
    regs.forEach(r => {
        if (showDesempenho) counts[r.studentLevel - 1]++;
        if (showAula) counts[r.classLevel - 1]++;
    });
    return {
        type: chartType,
        data: {
            labels: ['Nível 1', 'Nível 2', 'Nível 3', 'Nível 4'],
            datasets: [{
                label: 'Distribuição de níveis',
                data: counts,
                backgroundColor: ['#ef4444', '#f59e0b', '#0ea5e9', '#22c55e'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${ctx.raw} ocorrência(s)`
                    }
                }
            }
        }
    };
}

function criarConfigRadar(regs, showDesempenho, showAula) {
    const subjects = valoresCheckboxes('chartSubjectFilters');
    const agruparPorAula = subjects.length === 1;
    const grupos = new Map();
    regs.forEach(r => {
        const key = agruparPorAula ? r.lessonName : (r.subjectName || DEFAULT_SUBJECT_NAME);
        if (!grupos.has(key)) grupos.set(key, { label: key, count: 0, student: 0, aula: 0 });
        const g = grupos.get(key);
        g.count++;
        g.student += r.studentLevel;
        g.aula += r.classLevel;
    });
    const valores = [...grupos.values()]
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
        .slice(0, 8);
    const labels = valores.map(g => g.label);
    const datasets = [];
    if (showDesempenho) {
        datasets.push({
            label: 'Média desempenho',
            data: valores.map(g => Number((g.student / g.count).toFixed(2))),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.22)',
            pointBackgroundColor: '#3b82f6'
        });
    }
    if (showAula) {
        datasets.push({
            label: 'Média das aulas',
            data: valores.map(g => Number((g.aula / g.count).toFixed(2))),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22,163,74,0.18)',
            pointBackgroundColor: '#16a34a'
        });
    }
    return {
        type: 'radar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { min: 0, max: 4, ticks: { stepSize: 1 } } },
            plugins: { legend: { position: 'bottom' } }
        }
    };
}

function criarConfigGrafico(chartType, regs, showDesempenho, showAula) {
    if (chartType === 'pie' || chartType === 'doughnut') return criarConfigDistribuicao(chartType, regs, showDesempenho, showAula);
    if (chartType === 'radar') return criarConfigRadar(regs, showDesempenho, showAula);
    return criarConfigEvolucao(chartType, regs, showDesempenho, showAula);
}

function renderGrafico() {
    const wrapper = $('chartWrapper');
    const empty = $('emptyChart');
    const modal = $('modalChart');
    const regs = registrosFiltradosGrafico();
    const showDesempenho = $('chartShowDesempenho').checked;
    const showAula = $('chartShowAula').checked;
    const chartType = $('chartType').value;
    renderPrintChart(regs, showDesempenho, showAula);
    atualizarResumoBotaoGrafico(regs);

    if (!modal.open) {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        return;
    }

    if (typeof Chart === 'undefined') {
        wrapper.style.display = 'none';
        empty.style.display = 'block';
        empty.innerHTML = '<i class="fas fa-triangle-exclamation"></i><br>Não foi possível carregar o gráfico. Os registros continuam salvos.';
        return;
    }

    if (!regs.length || (!showDesempenho && !showAula)) {
        wrapper.style.display = 'none';
        empty.style.display = 'block';
        empty.innerHTML = !regs.length
            ? mensagemGraficoVazio()
            : '<i class="fas fa-eye-slash"></i><br>Ative ao menos uma série para ver o gráfico.';
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        return;
    }

    wrapper.style.display = 'block';
    empty.style.display = 'none';

    const config = criarConfigGrafico(chartType, regs, showDesempenho, showAula);

    const ctx = $('evolucaoChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, config);
}

function renderInsights() {
    const el = $('insights');
    if (registros.length < 2) {
        el.innerHTML = '<div class="empty-message"><i class="fas fa-seedling"></i><br>Os destaques aparecem depois dos primeiros registros.</div>';
        return;
    }

    const melhor = [...registros].sort((a, b) => b.studentLevel - a.studentLevel || parseIsoLocal(b.date) - parseIsoLocal(a.date))[0];
    const maisConfusa = [...registros].sort((a, b) => a.classLevel - b.classLevel || parseIsoLocal(b.date) - parseIsoLocal(a.date))[0];
    const assuntos = registros.reduce((acc, r) => {
        const key = `${normalizarChaveAula(r.subjectName || DEFAULT_SUBJECT_NAME)}|${normalizarChaveAula(r.lessonName)}`;
        if (!acc[key]) acc[key] = { nome: `${r.subjectName || DEFAULT_SUBJECT_NAME} · ${r.lessonName}`, total: 0, soma: 0 };
        acc[key].total++;
        acc[key].soma += r.studentLevel;
        return acc;
    }, {});
    const recorrente = Object.values(assuntos).sort((a, b) => b.total - a.total || (b.soma / b.total) - (a.soma / a.total))[0];

    const cards = [
        `<div class="insight-card"><strong>Melhor desempenho</strong><span>${escapeHtml(melhor.subjectName || DEFAULT_SUBJECT_NAME)} · ${escapeHtml(melhor.lessonName)} chegou ao nível ${melhor.studentLevel} em ${formatarData(melhor.date)}.</span></div>`,
        `<div class="insight-card"><strong>Aula que pediu atenção</strong><span>${escapeHtml(maisConfusa.subjectName || DEFAULT_SUBJECT_NAME)} · ${escapeHtml(maisConfusa.lessonName)} ficou como "${AVALIACAO[maisConfusa.classLevel].texto}".</span></div>`,
        `<div class="insight-card"><strong>Assunto mais registrado</strong><span>${escapeHtml(recorrente.nome)} aparece ${recorrente.total} vez(es), média ${(recorrente.soma / recorrente.total).toFixed(1)}.</span></div>`,
        `<div class="insight-card"><strong>Total refletido</strong><span>${registros.filter(r => r.observation).length} registro(s) têm observação escrita.</span></div>`
    ];
    el.innerHTML = cards.join('');
}

function renderMetas() {
    const el = $('listaMetas');
    if (!metas.length) {
        el.innerHTML = '<div class="empty-message"><i class="fas fa-flag-checkered"></i><br>Adicione uma meta para acompanhar seu avanço por assunto.</div>';
        return;
    }

    const hojeIso = isoLocal();
    const ordenadas = [...metas].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.dueDate.localeCompare(b.dueDate) || (a.subjectName || '').localeCompare(b.subjectName || '', 'pt-BR') || a.lessonName.localeCompare(b.lessonName, 'pt-BR');
    });

    el.innerHTML = ordenadas.map(meta => {
        const progresso = progressoMeta(meta);
        const atrasada = !meta.done && meta.dueDate < hojeIso;
        const dias = Math.ceil((parseIsoLocal(meta.dueDate) - parseIsoLocal(hojeIso)) / 86400000);
        const prazo = meta.done
            ? `Concluída em ${formatarData(meta.doneAt || hojeIso)}`
            : (atrasada ? `Prazo encerrado em ${formatarData(meta.dueDate)}` : (dias === 0 ? 'Vence hoje' : `Faltam ${dias} dia${dias > 1 ? 's' : ''}`));
        const ultimo = progresso.ultimo
            ? `Melhor nível ${progresso.maiorNivel} em ${formatarData(progresso.ultimo.date)}`
            : 'Ainda sem registro nesse assunto';

        return `
        <article class="goal-item${meta.done ? ' done' : ''}${atrasada ? ' overdue' : ''}">
            <div class="goal-header">
                <div>
                    <strong>${escapeHtml(meta.lessonName)}</strong>
                    <span>${meta.subjectName ? `${escapeHtml(meta.subjectName)} · ` : ''}Meta: nível ${meta.targetLevel} até ${formatarData(meta.dueDate)}</span>
                </div>
                <button class="btn-del-goal" data-id="${meta.id}" type="button" aria-label="Remover meta ${escapeHtml(meta.lessonName)}"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="goal-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso.percent}" aria-label="Progresso da meta ${escapeHtml(meta.lessonName)}">
                <span style="width:${progresso.percent}%"></span>
            </div>
            <div class="goal-meta">
                <span>${ultimo}</span>
                <span>${prazo}</span>
            </div>
        </article>`;
    }).join('');
}

function inicioSemanaAtual() {
    const d = parseIsoLocal(isoLocal());
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);
    return isoLocal(d);
}

function renderResumoSemanal() {
    const el = $('weeklySummary');
    const inicio = inicioSemanaAtual();
    const fimDate = parseIsoLocal(inicio);
    fimDate.setDate(fimDate.getDate() + 6);
    const fim = isoLocal(fimDate);
    const regs = registros.filter(r => r.date >= inicio && r.date <= fim);

    if (!regs.length) {
        el.innerHTML = `<div class="empty-message"><i class="fas fa-calendar-plus"></i><br>Nenhuma aula registrada entre ${formatarData(inicio)} e ${formatarData(fim)}.</div>`;
        return;
    }

    const melhor = [...regs].sort((a, b) => b.studentLevel - a.studentLevel || parseIsoLocal(b.date) - parseIsoLocal(a.date))[0];
    const mediaDes = media(regs, 'studentLevel').toFixed(1);
    const mediaAula = media(regs, 'classLevel').toFixed(1);
    const reflexoes = regs.filter(r => r.observation).length;
    const diasComRegistro = new Set(regs.map(r => r.date)).size;

    el.innerHTML = `
        <div class="weekly-grid">
            <div class="weekly-card"><strong>${regs.length}</strong><span>aula${regs.length > 1 ? 's' : ''}</span></div>
            <div class="weekly-card"><strong>${mediaDes}</strong><span>média desempenho</span></div>
            <div class="weekly-card"><strong>${mediaAula}</strong><span>média das aulas</span></div>
        </div>
        <p class="weekly-text">Melhor momento: ${escapeHtml(melhor.lessonName)} chegou ao nível ${melhor.studentLevel}. ${reflexoes} registro(s) têm observação, em ${diasComRegistro} dia(s) da semana.</p>`;
}

function renderQuadranteAluno() {
    const el = $('studentQuadrant');
    if (registros.length < 2) {
        el.innerHTML = '<div class="empty-message"><i class="fas fa-table-cells-large"></i><br>Registre algumas aulas para comparar sua experiência com seu desempenho.</div>';
        return;
    }

    const quadrantes = [
        {
            title: 'Aula boa + desempenho alto',
            desc: 'níveis 3-4 nos dois',
            cls: 'quadrant-strong',
            regs: registros.filter(r => r.classLevel >= 3 && r.studentLevel >= 3)
        },
        {
            title: 'Aula boa + desempenho em construção',
            desc: 'aula 3-4, desempenho 1-2',
            cls: 'quadrant-watch',
            regs: registros.filter(r => r.classLevel >= 3 && r.studentLevel <= 2)
        },
        {
            title: 'Aula difícil + desempenho alto',
            desc: 'aula 1-2, desempenho 3-4',
            cls: 'quadrant-resilient',
            regs: registros.filter(r => r.classLevel <= 2 && r.studentLevel >= 3)
        },
        {
            title: 'Aula difícil + desempenho em construção',
            desc: 'níveis 1-2 nos dois',
            cls: 'quadrant-risk',
            regs: registros.filter(r => r.classLevel <= 2 && r.studentLevel <= 2)
        }
    ];

    const total = registros.length;
    const cells = quadrantes.map(q => {
        const pct = Math.round((q.regs.length / total) * 100);
        return `<div class="quadrant-cell ${q.cls}" role="listitem">
            <strong>${q.regs.length}</strong>
            <span>${q.title}</span>
            <small>${pct}% · ${q.desc}</small>
        </div>`;
    }).join('');

    const excelentes = registros.filter(r => r.classLevel === 4);
    const insight = excelentes.length
        ? `Nas aulas marcadas como excelentes, seu desempenho médio foi ${media(excelentes, 'studentLevel').toFixed(1)} em ${excelentes.length} registro(s).`
        : 'Quando uma aula parecer excelente, esse bloco vai mostrar como seu desempenho acompanha essa percepção.';

    el.innerHTML = `
        <div class="quadrant-grid" role="list">${cells}</div>
        <p class="quadrant-insight">${insight}</p>`;
}

function materiaPermitidaNoFormulario(subjectName) {
    const materia = materiaPorNome(subjectName);
    if (materia?.active !== false) return true;
    const editId = Number($('editId').value);
    const registro = registros.find(r => r.id === editId);
    return Boolean(registro && nomesIguais(registro.subjectName || DEFAULT_SUBJECT_NAME, subjectName));
}

function renderSubjectSelect(preferida = '') {
    const select = $('subjectSelect');
    if (!select) return;
    const atual = preferida || select.value || primeiraMateriaAtiva();
    const active = materiasAtivas();
    if (!active.length) {
        garantirMateria(DEFAULT_SUBJECT_NAME, { active: true, reativar: true });
        salvarMaterias();
    }

    const options = materiasAtivas().map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`);
    const atualNoAtivo = materiasAtivas().some(m => nomesIguais(m.name, atual));
    const atualMateria = materiaPorNome(atual);
    if (atual && !atualNoAtivo && atualMateria) {
        options.push(`<option value="${escapeHtml(atualMateria.name)}">${escapeHtml(atualMateria.name)} (excluída)</option>`);
    }
    select.innerHTML = options.join('');
    select.value = options.length && [...select.options].some(option => option.value === atual)
        ? atual
        : primeiraMateriaAtiva();
}

function renderGoalSubjectSelect() {
    const select = $('goalSubject');
    if (!select) return;
    const atual = select.value;
    select.innerHTML = '<option value="">Sem matéria específica</option>' +
        materiasAtivas().map(m => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join('');
    select.value = materiasAtivas().some(m => nomesIguais(m.name, atual)) ? atual : '';
}

function renderFiltroMateria() {
    const select = $('filtroMateria');
    if (!select) return;
    const atual = select.value;
    const options = todasMateriasParaFiltro();
    select.innerHTML = '<option value="">Todas as matérias</option>' +
        options.map(option => `<option value="${escapeHtml(option.name)}">${escapeHtml(option.name)}${option.active ? '' : ' (excluída)'}</option>`).join('');
    select.value = options.some(option => nomesIguais(option.name, atual)) ? atual : '';
}

function aulasAtivasDaMateria(subjectName) {
    const materia = materiaPorNome(subjectName);
    if (!materia || materia.active === false) return [];
    return valoresUnicosPorNome([
        ...(materia.lessons || []),
        ...registros
            .filter(r => nomesIguais(r.subjectName || DEFAULT_SUBJECT_NAME, materia.name))
            .map(r => r.lessonName)
    ]);
}

function aulasParaMeta(subjectName) {
    if (subjectName) return aulasAtivasDaMateria(subjectName);
    const nomes = [];
    materiasAtivas().forEach(m => nomes.push(...aulasAtivasDaMateria(m.name)));
    metas.forEach(meta => nomes.push(meta.lessonName));
    return valoresUnicosPorNome(nomes);
}

function renderResumoMaterias() {
    const hint = $('subjectManagerHint');
    if (!hint) return;
    hint.textContent = `${materiasAtivas().length} matéria(s) ativa(s).`;
}

function renderizarCatalogoUI() {
    renderSubjectSelect($('subjectSelect')?.value || primeiraMateriaAtiva());
    renderGoalSubjectSelect();
    renderFiltroMateria();
    renderResumoMaterias();
    atualizarSugestoesAula();
    renderChartFilterOptions();
}

function renderizar() {
    sincronizarCatalogoComDados();
    renderizarCatalogoUI();
    renderizarLista();
    atualizarEstatisticas();
    renderMetas();
    renderResumoSemanal();
    renderQuadranteAluno();
    renderInsights();
}

function atualizarSugestoesAula() {
    const datalist = $('lessonSuggestions');
    const goalDatalist = $('goalLessonSuggestions');
    const materiaForm = $('subjectSelect')?.value || primeiraMateriaAtiva();
    const materiaMeta = $('goalSubject')?.value || '';
    const aulasForm = aulasAtivasDaMateria(materiaForm);
    const aulasMeta = aulasParaMeta(materiaMeta);

    datalist.innerHTML = aulasForm.slice(0, 30).map(nome => `<option value="${escapeHtml(nome)}"></option>`).join('');
    goalDatalist.innerHTML = aulasMeta.slice(0, 30).map(nome => `<option value="${escapeHtml(nome)}"></option>`).join('');
}

function atualizarContadores() {
    $('lessonNameCounter').textContent = `${$('lessonName').value.length}/100`;
    $('observationCounter').textContent = `${$('observation').value.length}/500`;
}

function atualizarTituloAluno() {
    const nome = $('studentName').value.trim();
    $('tituloAluno').textContent = nome ? `Portfólio de ${nome}` : 'Meu Portfólio';
}

function showToast(message, options = {}) {
    const { type = 'success', actionLabel = '', onAction = null, duration = 4200 } = options;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);

    let timer = null;
    const close = () => {
        clearTimeout(timer);
        toast.remove();
    };

    if (actionLabel && typeof onAction === 'function') {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = actionLabel;
        btn.addEventListener('click', () => {
            close();
            onAction();
        });
        toast.appendChild(btn);
    }

    $('toastRegion').appendChild(toast);
    timer = setTimeout(close, duration);
}

function mensagemMarcoSeHouver() {
    const total = registros.length;
    const mensagens = [];
    if ([1, 10, 25, 50, 100].includes(total)) {
        mensagens.push(total === 1 ? 'Primeira avaliação registrada.' : `${total} avaliações registradas.`);
    }
    if (registros.some(r => r.studentLevel === 4) && registros.filter(r => r.studentLevel === 4).length === 1) {
        mensagens.push('Primeiro nível 4 registrado.');
    }
    return mensagens.join(' ');
}

function baixarArquivo(conteudo, mimeType, extensao) {
    const blob = new Blob([conteudo], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const nome = slugNome($('studentName').value || localStorage.getItem(STUDENT_NAME_KEY) || 'aluno');
    a.href = url;
    a.download = `rubrica_${nome}_${isoLocal()}.${extensao}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function slugNome(nome) {
    return String(nome || 'aluno')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'aluno';
}

function escapeCSV(str) {
    if (str == null) return '';
    const s = String(str);
    if (/[;"\r\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function gerarCSVAluno(regs) {
    let csv = 'Data;Matéria;Aula;Meu Desempenho;Avaliação da Aula;Observação\n';
    sortByDate([...regs]).forEach(r => {
        csv += [
            escapeCSV(r.date),
            escapeCSV(r.subjectName || DEFAULT_SUBJECT_NAME),
            escapeCSV(r.lessonName),
            r.studentLevel,
            r.classLevel,
            escapeCSV(r.observation || '')
        ].join(';') + '\n';
    });
    return '\uFEFF' + csv;
}

function contarDelimitadorForaDeAspas(line, delim) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') { i++; continue; }
        if (ch === '"') quoted = !quoted;
        else if (ch === delim && !quoted) count++;
    }
    return count;
}

function detectarDelimitador(txt) {
    const primeira = txt.split(/\r?\n/, 1)[0] || '';
    return contarDelimitadorForaDeAspas(primeira, ',') > contarDelimitadorForaDeAspas(primeira, ';') ? ',' : ';';
}

function parseCSV(txt, delimiter = ';') {
    const rows = [];
    let row = [''];
    let col = 0;
    let insideQuotes = false;

    for (let i = 0; i < txt.length; i++) {
        const ch = txt[i];
        if (ch === '"') {
            if (insideQuotes && txt[i + 1] === '"') {
                row[col] += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (ch === delimiter && !insideQuotes) {
            row.push('');
            col++;
        } else if ((ch === '\n' || ch === '\r') && !insideQuotes) {
            if (ch === '\r' && txt[i + 1] === '\n') i++;
            rows.push(row);
            row = [''];
            col = 0;
        } else {
            row[col] += ch;
        }
    }
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
}

function normalizarHeader(s) {
    return String(s || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function prepararJSONImport(rawText) {
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (err) {
        console.error('[Import JSON] parse falhou', err);
        throw new Error('JSON inválido. O arquivo pode estar corrompido ou ter sido editado manualmente.');
    }
    const lista = Array.isArray(data) ? data : data?.registros;
    if (!Array.isArray(lista)) throw new Error('O JSON não possui o formato esperado: campo "registros" como lista.');

    const registrosImportados = sanearImportacao(lista);
    const temMetas = Array.isArray(data?.metas);
    const metasImportadas = temMetas ? sanearMetasImportacao(data.metas) : { novas: [], ignoradas: [] };
    const temMaterias = Array.isArray(data?.materias);
    const materiasImportadas = temMaterias ? sanearMateriasImportacao(data.materias) : { novas: [], ignoradas: [] };
    return {
        ...registrosImportados,
        metas: metasImportadas.novas,
        metasIgnoradas: metasImportadas.ignoradas,
        temMetas,
        materias: materiasImportadas.novas,
        materiasIgnoradas: materiasImportadas.ignoradas,
        temMaterias
    };
}

function prepararCSVImport(rawText) {
    let text = rawText;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const delimiter = detectarDelimitador(text);
    const rows = parseCSV(text, delimiter);
    if (rows.length < 2) throw new Error('CSV vazio: é preciso pelo menos o cabeçalho e uma linha de dados.');
    const header = rows[0].map(normalizarHeader);
    const hasMateria = ['materia', 'disciplina'].includes(header[1]);
    const aulaIndex = hasMateria ? 2 : 1;
    if (header[0] !== 'data' || !['aula', 'nome da aula', 'atividade'].includes(header[aulaIndex])) {
        throw new Error('Cabeçalho do CSV inválido. Esperado começar com "Data;Matéria;Aula" ou "Data;Aula".');
    }

    const lista = rows.slice(1).map(row => ({
        date: row[0],
        subjectName: hasMateria ? row[1] : DEFAULT_SUBJECT_NAME,
        lessonName: row[aulaIndex],
        studentLevel: row[aulaIndex + 1],
        classLevel: row[aulaIndex + 2],
        observation: row[aulaIndex + 3]
    }));
    return { ...sanearImportacao(lista), metas: [], metasIgnoradas: [], temMetas: false, materias: [], materiasIgnoradas: [], temMaterias: false };
}

function sanearImportacao(lista) {
    let nextId = Date.now();
    const ignoradas = [];
    const novos = [];
    lista.forEach((r, i) => {
        const normalizado = normalizarRegistro({ ...r, id: nextId++ }, nextId++);
        if (!normalizado) {
            ignoradas.push(i + 1);
            return;
        }
        novos.push(normalizado);
    });
    return { novos, ignoradas };
}

function sanearMetasImportacao(lista) {
    let nextId = Date.now() + 7000;
    const ignoradas = [];
    const novas = [];
    lista.forEach((meta, i) => {
        const normalizada = normalizarMeta({ ...meta, id: nextId++ }, nextId++);
        if (!normalizada) {
            ignoradas.push(i + 1);
            return;
        }
        novas.push(normalizada);
    });
    return { novas, ignoradas };
}

function sanearMateriasImportacao(lista) {
    let nextId = Date.now() + 11000;
    const ignoradas = [];
    const novas = [];
    lista.forEach((materia, i) => {
        const normalizada = normalizarMateria(
            typeof materia === 'string' ? materia : { ...materia, id: nextId++ },
            nextId++
        );
        if (!normalizada) {
            ignoradas.push(i + 1);
            return;
        }
        novas.push(normalizada);
    });
    return { novas, ignoradas };
}

function chaveRegistro(r) {
    return [
        r.date,
        normalizarChaveAula(r.subjectName || DEFAULT_SUBJECT_NAME),
        r.lessonName.trim().toLowerCase(),
        r.studentLevel,
        r.classLevel,
        (r.observation || '').trim().toLowerCase()
    ].join('|');
}

function chaveMeta(meta) {
    return [
        normalizarChaveAula(meta.subjectName || ''),
        normalizarChaveAula(meta.lessonName),
        meta.targetLevel,
        meta.dueDate
    ].join('|');
}

function abrirModalImportacao(resultado, tipo) {
    pendingImport = { ...resultado, tipo };
    if (!pendingImport.novos.length) {
        showToast('Nenhum registro válido encontrado. Nada foi importado.', { type: 'error', duration: 7000 });
        return;
    }

    const metasInfo = pendingImport.temMetas
        ? ` ${pendingImport.metas.length} meta(s) válida(s) também serão consideradas.`
        : '';
    const materiasInfo = pendingImport.temMaterias
        ? ` ${pendingImport.materias.length} matéria(s) válida(s) também serão consideradas.`
        : '';
    const invalidos = pendingImport.ignoradas.length + (pendingImport.metasIgnoradas?.length || 0) + (pendingImport.materiasIgnoradas?.length || 0);
    $('importSummary').textContent = `${pendingImport.novos.length} registro(s) válido(s) encontrados em ${tipo.toUpperCase()}.${metasInfo}${materiasInfo} ${invalidos ? `${invalidos} linha(s)/item(ns) serão ignorados.` : 'Nenhum item inválido encontrado.'}`;
    $('modalImport').showModal();
}

function aplicarImportacao() {
    if (!pendingImport) return;
    const modo = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
    let adicionados = pendingImport.novos.length;
    let duplicados = 0;
    let metasAdicionadas = 0;
    let metasDuplicadas = 0;
    let materiasAdicionadas = 0;

    if (modo === 'replace') {
        registros = pendingImport.novos.map((r, i) => ({ ...r, id: Date.now() + i }));
        if (pendingImport.temMetas) {
            metas = pendingImport.metas.map((meta, i) => ({ ...meta, id: Date.now() + i + 7000 }));
            metasAdicionadas = metas.length;
        }
        materias = pendingImport.temMaterias
            ? pendingImport.materias.map((materia, i) => ({ ...materia, id: Date.now() + i + 11000 }))
            : [];
        materiasAdicionadas = materias.length;
    } else {
        const existentes = new Set(registros.map(chaveRegistro));
        const paraAdicionar = [];
        pendingImport.novos.forEach((r, i) => {
            const key = chaveRegistro(r);
            if (existentes.has(key)) {
                duplicados++;
                return;
            }
            existentes.add(key);
            paraAdicionar.push({ ...r, id: Date.now() + i + 1000 });
        });
        registros = registros.concat(paraAdicionar);
        adicionados = paraAdicionar.length;

        if (pendingImport.temMetas) {
            const metasExistentes = new Set(metas.map(chaveMeta));
            const metasParaAdicionar = [];
            pendingImport.metas.forEach((meta, i) => {
                const key = chaveMeta(meta);
                if (metasExistentes.has(key)) {
                    metasDuplicadas++;
                    return;
                }
                metasExistentes.add(key);
                metasParaAdicionar.push({ ...meta, id: Date.now() + i + 8000 });
            });
            metas = metas.concat(metasParaAdicionar);
            metasAdicionadas = metasParaAdicionar.length;
        }

        if (pendingImport.temMaterias) {
            const antes = materias.length;
            pendingImport.materias.forEach(materia => mesclarMateriaNoCatalogo(materia, { reativar: false }));
            materiasAdicionadas = Math.max(0, materias.length - antes);
        }
    }

    sortByDate(registros);
    sincronizarCatalogoComDados();
    salvar();
    if (pendingImport.temMetas) salvarMetas();
    salvarMaterias();
    const metaMsgs = avaliarMetasAtingidas();
    limparForm();
    renderizar();
    $('modalImport').close();
    const resumoMetas = pendingImport.temMetas
        ? ` ${modo === 'replace' ? `${metasAdicionadas} meta(s) carregada(s).` : `${metasAdicionadas} meta(s) adicionada(s)${metasDuplicadas ? `, ${metasDuplicadas} duplicada(s) ignorada(s)` : ''}.`}`
        : '';
    const resumoMaterias = pendingImport.temMaterias
        ? ` ${modo === 'replace' ? `${materiasAdicionadas} matéria(s) carregada(s).` : `${materiasAdicionadas} matéria(s) nova(s) no catálogo.`}`
        : '';
    const resumoImport = modo === 'replace'
        ? `Importação concluída: ${registros.length} registro(s) carregado(s).`
        : `Importação concluída: ${adicionados} adicionado(s)${duplicados ? `, ${duplicados} duplicado(s) ignorado(s)` : ''}.`;
    showToast([resumoImport, resumoMetas, resumoMaterias, ...metaMsgs].join(' ').trim(), { type: 'success', duration: 8000 });
    pendingImport = null;
}

function registrosParaExportar() {
    const escopo = $('exportPeriodo').value;
    if (escopo === 'filtered') return getRegistrosFiltrados();
    return registrosPorPeriodo(escopo);
}

function atualizarOpcaoExportFiltros() {
    const option = $('exportPeriodo').querySelector('option[value="filtered"]');
    if (!option) return;
    const regs = getRegistrosFiltrados();
    option.textContent = `Filtros do histórico (${resumoPeriodo(regs)})`;
}

function resumoPeriodo(regs) {
    if (!regs.length) return '0 registros';
    const datas = regs.map(r => r.date).sort();
    const intervalo = datas[0] === datas[datas.length - 1]
        ? formatarData(datas[0])
        : `${formatarData(datas[0])} a ${formatarData(datas[datas.length - 1])}`;
    return `${regs.length} registro(s), ${intervalo}`;
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function adicionarMateriaPeloFormulario() {
    const input = $('newSubjectName');
    const nome = normalizarTexto(input.value, 80);
    if (!nome) {
        showToast('Informe o nome da matéria.', { type: 'warning' });
        input.focus();
        return;
    }
    const existente = materiaPorNome(nome);
    if (existente?.active !== false) {
        renderSubjectSelect(existente.name);
        renderResumoMaterias();
        atualizarSugestoesAula();
        salvarRascunho();
        showToast('Essa matéria já está ativa.', { type: 'warning' });
        return;
    }
    const materia = existente || garantirMateria(nome, { active: true });
    materia.active = true;
    salvarMaterias();
    input.value = '';
    renderizarCatalogoUI();
    $('subjectSelect').value = materia.name;
    renderResumoMaterias();
    atualizarSugestoesAula();
    showToast('Matéria adicionada.', { type: 'success' });
}

function atualizarPreferenciasGraficoDosControles({ incluirListas = true } = {}) {
    chartPrefs.chartType = $('chartType').value;
    chartPrefs.startDate = dataIsoValida($('chartStartDate').value) ? $('chartStartDate').value : '';
    chartPrefs.endDate = dataIsoValida($('chartEndDate').value) ? $('chartEndDate').value : '';
    chartPrefs.showDesempenho = $('chartShowDesempenho').checked;
    chartPrefs.showAula = $('chartShowAula').checked;
    if (incluirListas) {
        chartPrefs.selectedSubjects = valoresCheckboxes('chartSubjectFilters');
        chartPrefs.selectedLessons = valoresCheckboxes('chartLessonFilters');
    }
    salvarPreferenciasGrafico();
}

function abrirModalGrafico(trigger = null) {
    lastChartTrigger = trigger;
    const modal = $('modalChart');
    renderChartFilterOptions();
    modal.classList.remove('is-closing');
    modal.showModal();
    requestAnimationFrame(() => {
        $('btnCloseChart').focus();
        renderGrafico();
        if (chartInstance) chartInstance.resize();
    });
}

function fecharModalGrafico() {
    const modal = $('modalChart');
    if (!modal.open || modal.classList.contains('is-closing')) return;
    modal.classList.add('is-closing');
    setTimeout(() => {
        modal.close();
        modal.classList.remove('is-closing');
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        if (lastChartTrigger) lastChartTrigger.focus();
    }, 150);
}

function limparFiltrosGrafico() {
    chartPrefs.selectedSubjects = null;
    chartPrefs.selectedLessons = null;
    chartPrefs.startDate = '';
    chartPrefs.endDate = '';
    chartPrefs.chartType = 'line';
    chartPrefs.showDesempenho = true;
    chartPrefs.showAula = true;
    aplicarPreferenciasGraficoUI();
    salvarPreferenciasGrafico();
    renderGrafico();
}

function configurarEventos() {
    $('avaliacaoForm').addEventListener('submit', e => {
        e.preventDefault();
        if (!validarForm()) return;
        const dados = dadosDoForm();
        const editId = $('editId').value;
        editId ? atualizarRegistro(parseInt(editId, 10), dados) : adicionarRegistro(dados);
    });

    $('btnCancelar').addEventListener('click', () => {
        limparForm();
        renderizarLista();
    });

    $('goalForm').addEventListener('submit', e => {
        e.preventDefault();
        adicionarMeta();
    });

    ['goalSubject', 'goalLesson', 'goalDate', 'goalLevel'].forEach(id => {
        $(id).addEventListener('input', () => {
            $(id).classList.remove('is-invalid');
            $('goalError').textContent = '';
            if (id === 'goalSubject') atualizarSugestoesAula();
        });
    });
    $('goalSubject').addEventListener('change', atualizarSugestoesAula);

    $('listaMetas').addEventListener('click', e => {
        const delBtn = e.target.closest('.btn-del-goal');
        if (delBtn) excluirMeta(Number(delBtn.dataset.id));
    });

    $('subjectSelect').addEventListener('change', () => {
        $('subjectSelect').classList.remove('is-invalid');
        $('subjectSelectError').textContent = '';
        renderResumoMaterias();
        atualizarSugestoesAula();
        salvarRascunho();
    });

    $('btnAddSubject').addEventListener('click', adicionarMateriaPeloFormulario);
    $('newSubjectName').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        adicionarMateriaPeloFormulario();
    });

    ['lessonName', 'lessonDate', 'observation'].forEach(id => {
        $(id).addEventListener('input', () => {
            atualizarContadores();
            salvarRascunho();
            if (id === 'lessonName' || id === 'lessonDate') {
                $(id).classList.remove('is-invalid');
                $(`${id}Error`).textContent = '';
            }
        });
    });

    document.querySelectorAll('.level-choice').forEach(btn => {
        btn.addEventListener('click', () => setNivel(btn.dataset.target, btn.dataset.value));
    });

    document.querySelectorAll('[data-date-shortcut]').forEach(btn => {
        btn.addEventListener('click', () => {
            $('lessonDate').value = btn.dataset.dateShortcut === 'yesterday' ? isoDiasAtras(1) : isoLocal();
            $('lessonDate').classList.remove('is-invalid');
            $('lessonDateError').textContent = '';
            salvarRascunho();
        });
    });

    $('listaRegistros').addEventListener('click', e => {
        const editBtn = e.target.closest('.btn-edit');
        const delBtn = e.target.closest('.btn-del');
        const firstBtn = e.target.closest('#btnPrimeiroRegistro');
        if (editBtn) editarRegistro(Number(editBtn.dataset.id));
        else if (delBtn) excluirRegistro(Number(delBtn.dataset.id));
        else if (firstBtn) $('formCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    const atualizarListaEFiltrosExport = () => {
        renderizarLista();
        atualizarOpcaoExportFiltros();
    };
    const renderListaDebounced = debounce(atualizarListaEFiltrosExport, 250);
    $('filtroMateria').addEventListener('change', atualizarListaEFiltrosExport);
    $('filtroAula').addEventListener('input', renderListaDebounced);
    $('filtroData').addEventListener('input', atualizarListaEFiltrosExport);
    $('sortHistorico').addEventListener('change', () => {
        localStorage.setItem(SORT_KEY, $('sortHistorico').value);
        atualizarListaEFiltrosExport();
    });

    $('btnOpenChart').addEventListener('click', e => abrirModalGrafico(e.currentTarget));
    $('btnCloseChart').addEventListener('click', fecharModalGrafico);
    $('modalChart').addEventListener('cancel', e => {
        e.preventDefault();
        fecharModalGrafico();
    });
    $('modalChart').addEventListener('click', e => {
        if (e.target === $('modalChart')) fecharModalGrafico();
    });
    $('chartSubjectFilters').addEventListener('change', () => {
        chartPrefs.selectedSubjects = valoresCheckboxes('chartSubjectFilters');
        chartPrefs.selectedLessons = null;
        renderChartFilterOptions();
        atualizarPreferenciasGraficoDosControles();
        renderGrafico();
    });
    $('chartLessonFilters').addEventListener('change', () => {
        atualizarPreferenciasGraficoDosControles();
        atualizarResumoFiltrosGrafico();
        renderGrafico();
    });
    ['chartType', 'chartStartDate', 'chartEndDate', 'chartShowDesempenho', 'chartShowAula'].forEach(id => {
        $(id).addEventListener('change', () => {
            atualizarPreferenciasGraficoDosControles({ incluirListas: false });
            atualizarResumoFiltrosGrafico();
            renderGrafico();
        });
    });
    $('btnClearChartFilters').addEventListener('click', limparFiltrosGrafico);

    const salvarNomeAluno = debounce(() => {
        localStorage.setItem(STUDENT_NAME_KEY, $('studentName').value.trim());
    }, 300);
    $('studentName').addEventListener('input', () => {
        atualizarTituloAluno();
        salvarNomeAluno();
    });

    $('btnExport').addEventListener('click', () => {
        atualizarOpcaoExportFiltros();
        $('modalExport').showModal();
    });
    $('btnCancelExport').addEventListener('click', () => $('modalExport').close());
    $('btnConfirmExport').addEventListener('click', () => {
        const regs = registrosParaExportar();
        if (!regs.length) {
            showToast('Não há registros nesse escopo para exportar.', { type: 'warning' });
            return;
        }
        const formato = $('exportFormato').value;
        if (formato === 'json') {
            const payload = {
                meta: { version: 4, exportedAt: new Date().toISOString(), studentName: $('studentName').value.trim() },
                registros: regs,
                metas,
                materias
            };
            baixarArquivo(JSON.stringify(payload, null, 2), 'application/json', 'json');
        } else {
            baixarArquivo(gerarCSVAluno(regs), 'text/csv;charset=utf-8', 'csv');
        }
        $('modalExport').close();
        showToast(`${regs.length} registro(s) exportado(s).`, { type: 'success' });
    });

    $('btnImport').addEventListener('click', () => $('fileImport').click());
    $('fileImport').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const isCsv = file.name.toLowerCase().endsWith('.csv');
                abrirModalImportacao(isCsv ? prepararCSVImport(ev.target.result) : prepararJSONImport(ev.target.result), isCsv ? 'csv' : 'json');
            } catch (err) {
                console.error('[Import] falhou', err);
                showToast(err?.message || 'Falha ao processar o arquivo.', { type: 'error', duration: 8000 });
            } finally {
                e.target.value = '';
            }
        };
        reader.onerror = () => {
            showToast('Não foi possível ler o arquivo.', { type: 'error' });
            e.target.value = '';
        };
        reader.readAsText(file);
    });

    $('btnConfirmImport').addEventListener('click', aplicarImportacao);
    $('btnCancelImport').addEventListener('click', () => {
        pendingImport = null;
        $('modalImport').close();
    });

    document.addEventListener('themechange', renderGrafico);
}

function aplicarPreferenciasGraficoUI() {
    $('chartShowDesempenho').checked = chartPrefs.showDesempenho;
    $('chartShowAula').checked = chartPrefs.showAula;
    $('chartType').value = chartPrefs.chartType;
    $('chartStartDate').value = chartPrefs.startDate || '';
    $('chartEndDate').value = chartPrefs.endDate || '';
    renderChartFilterOptions();
}

function registrarServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('../sw.js').catch(err => {
            console.info('[PWA] Service worker não registrado', err);
        });
    });
}

function init() {
    $('lessonDate').value = isoLocal();
    $('goalDate').value = isoDiasAFrente(30);
    $('btnCancelar').hidden = true;
    $('studentName').value = localStorage.getItem(STUDENT_NAME_KEY) || '';
    atualizarTituloAluno();
    $('sortHistorico').value = localStorage.getItem(SORT_KEY) || 'recent';
    carregar();
    carregarMetas();
    carregarMaterias();
    aplicarPreferenciasGraficoUI();
    avaliarMetasAtingidas();
    renderizarCatalogoUI();
    restaurarRascunho();
    configurarEventos();
    atualizarContadores();
    renderizar();
    registrarServiceWorker();
}

init();

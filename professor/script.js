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

function hoje() { return new Date().toISOString().slice(0, 10); }
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
    mostrar('secaoAlunos');
}

function renderTurmas() {
    const el = document.getElementById('listaTurmas');
    if (!turmas.length) {
        el.innerHTML = '<div class="aviso"><i class="fas fa-school"></i><br>Nenhuma turma cadastrada.</div>';
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
        el.innerHTML = '<div class="aviso"><i class="fas fa-user-slash"></i><br>Nenhum aluno nesta turma.</div>';
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
            <i class="fas fa-user-graduate" style="color:#3b82f6;"></i>
            <span class="item-nome">${escapeHtml(a.nome)}</span>
            <span class="item-badge">${qtd} aval.</span>
            <button class="item-del" data-id="${a.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
        </div>`;
    }).join('');
}

// Event Delegation for Alunos
document.getElementById('listaAlunos').addEventListener('click', e => {
    const delBtn = e.target.closest('.item-del');
    const item = e.target.closest('.aluno-item');
    if (delBtn) {
        e.stopPropagation();
        excluirAluno(Number(delBtn.dataset.id));
    } else if (item) {
        selecionarAluno(Number(item.dataset.id));
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
    const reg = avaliacoes.filter(av => av.alunoId === alunoAtivo);
    if (!reg.length) {
        el.innerHTML = '<div class="aviso"><i class="fas fa-clipboard-list"></i><br>Nenhuma avaliação registrada.</div>';
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
    const alunosComAvals = alunos.filter(a => avaliacoes.some(av => av.alunoId === a.id));
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

    const datas = [...new Set(avaliacoes.map(av => av.date))].sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    const labels = datas.map(d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; });

    const alunoAvals = {};
    avaliacoes.forEach(av => {
        if (!alunoAvals[av.alunoId]) alunoAvals[av.alunoId] = [];
        alunoAvals[av.alunoId].push(av);
    });

    const datasets = alunosComAvals.map((aluno, i) => {
        const cor = PALETTE[i % PALETTE.length];
        const avMap = {};
        (alunoAvals[aluno.id] || []).forEach(av => { avMap[av.date] = av.desempenho; });
        return {
            label: escapeHtml(aluno.nome), // Prevent XSS in Chart tooltip
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
    const alunosComAvals = alunos.filter(a => avaliacoes.some(av => av.alunoId === a.id));
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
    avaliacoes.forEach(av => {
        if (!alunoAvals[av.alunoId]) alunoAvals[av.alunoId] = [];
        alunoAvals[av.alunoId].push(av);
    });

    const datasets = alunosComAvals.map((aluno, i) => {
        const cor = PALETTE[i % PALETTE.length];
        const avs = alunoAvals[aluno.id] || [];
        const avgD = avs.reduce((s, av) => s + av.desempenho, 0) / avs.length;
        const avgE = avs.reduce((s, av) => s + av.evolucao, 0) / avs.length;
        return {
            label: escapeHtml(aluno.nome), // Prevent XSS in Chart tooltip
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

// Hashes SHA-256 de credenciais de acesso
const EXPECTED_USER_HASH = '5c62dbb490ed71afc967ac2b74283691217656988d9d291cdc18d13e0b03aaec';
const EXPECTED_PASS_HASH = '811f0a6ebc4535d48e341fe4ab5233313bca2e345e037a956b26a2d9a144cc2d';

async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleLogin() {
    const userVal = document.getElementById('userInput').value.trim();
    const passVal = document.getElementById('senhaInput').value;
    const erro = document.getElementById('loginErro');
    
    if (!userVal || !passVal) {
        erro.textContent = 'Preencha usuário e senha.';
        erro.style.display = 'block';
        return;
    }
    
    const hashedUser = await hashText(userVal);
    const hashedPass = await hashText(passVal);
    
    if (hashedUser === EXPECTED_USER_HASH && hashedPass === EXPECTED_PASS_HASH) {
        sessionStorage.setItem('prof_auth', 'true');
        initApp();
    } else {
        erro.textContent = 'Usuário ou senha incorretos.';
        erro.style.display = 'block';
    }
}

document.getElementById('btnEntrar').addEventListener('click', handleLogin);
document.getElementById('senhaInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
});
document.getElementById('userInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('senhaInput').focus();
});

function initApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('avalDate').value = hoje();
    carregar();
    renderTurmas();
    renderGraficos();
}

// Verificação de autenticação inicial baseada na sessão
if (sessionStorage.getItem('prof_auth') === 'true') {
    initApp();
}

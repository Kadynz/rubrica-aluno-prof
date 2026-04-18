let registros = [];
let chartInstance = null;
const STORAGE_KEY = 'portfolio_aluno_v1';

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

function hoje() {
    return new Date().toISOString().slice(0, 10);
}

function carregar() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        registros = Array.isArray(parsed) ? parsed : [];
    } catch {
        registros = [];
    }
    ordenar();
    renderizar();
}

function salvar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

function ordenar() {
    registros.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function renderizarLista() {
    const container = document.getElementById('listaRegistros');
    if (!registros.length) {
        container.innerHTML = '<div class="empty-message" aria-live="polite"><i class="fas fa-clipboard-list"></i><br>Nenhum registro ainda.</div>';
        return;
    }
    
    // Using event delegation so no inline onclicks are used (Security / Maintainability)
    container.innerHTML = [...registros].reverse().map(r => {
        const d = DESEMPENHO[r.studentLevel] || DESEMPENHO[1];
        const a = AVALIACAO[r.classLevel] || AVALIACAO[1];
        return `
        <div class="registro-item">
            <div class="registro-header">
                <span class="registro-nome"><i class="fas fa-chalkboard" style="color:#3b82f6;margin-right:5px;"></i>${escapeHtml(r.lessonName)}</span>
                <span class="registro-data"><i class="far fa-calendar"></i> ${formatarData(r.date)}</span>
            </div>
            <div class="niveis-info">
                <span class="nivel-chip ${d.cls}"><i class="fas fa-user-graduate"></i> ${d.emoji} ${d.texto}</span>
                <span class="nivel-chip ${a.cls}"><i class="fas fa-chalkboard-user"></i> ${a.emoji} ${a.texto}</span>
            </div>
            <div class="acoes">
                <button class="btn-edit" data-id="${r.id}"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-del" data-id="${r.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
            </div>
        </div>`;
    }).join('');
}

// Event Delegation for action buttons
document.getElementById('listaRegistros').addEventListener('click', e => {
    const editBtn = e.target.closest('.btn-edit');
    const delBtn = e.target.closest('.btn-del');
    
    if (editBtn) {
        editarRegistro(Number(editBtn.dataset.id));
    } else if (delBtn) {
        excluirRegistro(Number(delBtn.dataset.id));
    }
});

function atualizarEstatisticas() {
    const total = registros.length;
    document.getElementById('totalRegistros').textContent = total;

    if (!total) {
        document.getElementById('mediaDesempenho').textContent = '—';
        document.getElementById('mediaAula').textContent = '—';
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        return;
    }

    const sumS = registros.reduce((s, r) => s + r.studentLevel, 0);
    const sumC = registros.reduce((s, r) => s + r.classLevel, 0);
    document.getElementById('mediaDesempenho').textContent = (sumS / total).toFixed(1);
    document.getElementById('mediaAula').textContent = (sumC / total).toFixed(1);

    const labels = registros.map(r => formatarData(r.date));
    const data = registros.map(r => r.studentLevel);
    const ptColors = data.map(v =>
        v === 1 ? '#991b1b' : v === 2 ? '#b45309' : v === 3 ? '#0369a1' : '#166534'
    );

    const ctx = document.getElementById('evolucaoChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Desempenho',
                data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
                tension: 0.25,
                fill: true,
                pointBackgroundColor: ptColors,
                pointBorderColor: 'white',
                pointRadius: 5,
                pointHoverRadius: 7,
                borderWidth: 2.5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0.5, max: 4.5,
                    ticks: {
                        stepSize: 1,
                        font: { size: 10 },
                        callback: v => ({ 1: 'Inic.', 2: 'Bás.', 3: 'Prof.', 4: 'Avanç.' }[v] || '')
                    },
                    title: { display: true, text: 'Nível', font: { size: 10 } }
                },
                x: {
                    ticks: { maxRotation: 40, autoSkip: true, font: { size: 10 } }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const d = DESEMPENHO[ctx.raw];
                            return d ? ` ${d.emoji} Nível ${ctx.raw} – ${d.texto}` : ` Nível ${ctx.raw}`;
                        }
                    }
                },
                legend: { display: false }
            }
        }
    });
}

function renderizar() {
    renderizarLista();
    atualizarEstatisticas();
}

function adicionarRegistro(lessonName, date, studentLevel, classLevel) {
    registros.push({
        id: Date.now(),
        lessonName: lessonName.trim(),
        date,
        studentLevel: +studentLevel,
        classLevel: +classLevel
    });
    ordenar();
    salvar();
    renderizar();
    limparForm();
}

function atualizarRegistro(id, lessonName, date, studentLevel, classLevel) {
    const idx = registros.findIndex(r => r.id === id);
    if (idx !== -1) {
        registros[idx] = {
            ...registros[idx],
            lessonName: lessonName.trim(),
            date,
            studentLevel: +studentLevel,
            classLevel: +classLevel
        };
        ordenar();
        salvar();
        renderizar();
    }
    limparForm();
}

function excluirRegistro(id) {
    if (!confirm('Excluir este registro?')) return;
    registros = registros.filter(r => r.id !== id);
    salvar();
    renderizar();
}

function editarRegistro(id) {
    const r = registros.find(r => r.id === id);
    if (!r) return;
    document.getElementById('editId').value = r.id;
    document.getElementById('lessonName').value = r.lessonName;
    document.getElementById('lessonDate').value = r.date;
    document.getElementById('studentLevel').value = r.studentLevel;
    document.getElementById('classLevel').value = r.classLevel;
    document.getElementById('btnSalvar').innerHTML = '<i class="fas fa-pen"></i> Atualizar';
    document.getElementById('formCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function limparForm() {
    document.getElementById('editId').value = '';
    document.getElementById('lessonName').value = '';
    document.getElementById('lessonDate').value = hoje();
    document.getElementById('studentLevel').value = '3';
    document.getElementById('classLevel').value = '3';
    document.getElementById('btnSalvar').innerHTML = '<i class="fas fa-save"></i> Salvar';
}

document.getElementById('avaliacaoForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('editId').value;
    const lessonName = document.getElementById('lessonName').value.trim();
    const date = document.getElementById('lessonDate').value;
    const sl = document.getElementById('studentLevel').value;
    const cl = document.getElementById('classLevel').value;

    // Validation
    if (!lessonName) {
        alert('Informe o nome da aula.');
        return;
    }
    if (!date) {
        alert('Selecione a data.');
        return;
    }

    editId ? atualizarRegistro(parseInt(editId, 10), lessonName, date, sl, cl)
           : adicionarRegistro(lessonName, date, sl, cl);
});

document.getElementById('btnCancelar').addEventListener('click', limparForm);

// Initialization
document.getElementById('lessonDate').value = hoje();
carregar();

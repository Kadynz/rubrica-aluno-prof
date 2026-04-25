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

// escapeHtml, formatarData, hoje, sortByDate, corPontoNivel, labelNivelCurto
// vêm de ../shared/utils.js

function carregar() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        registros = Array.isArray(parsed) ? parsed : [];
    } catch {
        registros = [];
    }
    sortByDate(registros);
    renderizar();
}

function salvar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

function renderizarLista() {
    const container = document.getElementById('listaRegistros');
    if (!registros.length) {
        container.innerHTML = '<div class="empty-message" aria-live="polite"><i class="fas fa-clipboard-list"></i><br>Nenhum registro ainda.</div>';
        return;
    }
    
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
    const ptColors = data.map(corPontoNivel);

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
                        callback: labelNivelCurto
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
    sortByDate(registros);
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
        sortByDate(registros);
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

document.getElementById('lessonDate').value = hoje();
carregar();

// Tema (toggle + defaults do Chart.js) em ../shared/theme.js.
// Aqui só re-renderizamos o gráfico quando o tema muda.
document.addEventListener('themechange', atualizarEstatisticas);

// Importação / Exportação de Dados
function baixarArquivo(conteudo, mimeType, extensao) {
    const blob = new Blob([conteudo], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubrica_aluno_${new Date().toISOString().split('T')[0]}.${extensao}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function escapeCSV(str) {
    if (str == null) return '';
    const s = String(str);
    if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function gerarCSVAluno(regs) {
    let csv = 'Data;Aula;Meu Desempenho;Avaliação da Aula\n';
    sortByDate([...regs]).forEach(r => {
        csv += [
            escapeCSV(r.date),
            escapeCSV(r.lessonName),
            r.studentLevel,
            r.classLevel
        ].join(';') + '\n';
    });
    return '\uFEFF' + csv;
}

// Parser CSV (delimitador ';') com suporte a "" como aspas escapadas dentro
// de campos entre aspas. Normaliza CRLF → LF.
function parseCSV(txt) {
    const rows = [];
    let row = [''];
    let col = 0;
    let insideQuotes = false;
    let prev = '';

    for (const ch of txt) {
        if (ch === '"') {
            if (!insideQuotes && prev === '"') row[col] += '"';
            insideQuotes = !insideQuotes;
        } else if (ch === ';' && !insideQuotes) {
            row.push('');
            col++;
        } else if (ch === '\n' && !insideQuotes) {
            if (prev === '\r') row[col] = row[col].slice(0, -1);
            rows.push(row);
            row = [''];
            col = 0;
        } else {
            row[col] += ch;
        }
        prev = ch;
    }
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
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

document.getElementById('btnExport').addEventListener('click', () => {
    document.getElementById('modalExport').style.display = 'flex';
});

document.getElementById('btnCancelExport').addEventListener('click', () => {
    document.getElementById('modalExport').style.display = 'none';
});

document.getElementById('btnConfirmExport').addEventListener('click', () => {
    const formato = document.getElementById('exportFormato').value;
    if (formato === 'json') {
        baixarArquivo(JSON.stringify({ registros }, null, 2), 'application/json', 'json');
    } else if (formato === 'csv') {
        baixarArquivo(gerarCSVAluno(registros), 'text/csv;charset=utf-8', 'csv');
    }
    document.getElementById('modalExport').style.display = 'none';
});

document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('fileImport').click();
});

document.getElementById('fileImport').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        try {
            if (isCsv) importarCSVAluno(ev.target.result);
            else importarJSONAluno(ev.target.result);
        } catch (err) {
            console.error('[Import] falha inesperada', err);
            alert('Falha ao processar o arquivo. Verifique a integridade e tente novamente.');
        } finally {
            e.target.value = '';
        }
    };
    reader.onerror = () => {
        alert('Não foi possível ler o arquivo.');
        e.target.value = '';
    };
    reader.readAsText(file);
});

function importarJSONAluno(rawText) {
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (err) {
        console.error('[Import JSON] parse falhou', err);
        alert('JSON inválido. O arquivo pode estar corrompido ou ter sido editado manualmente.');
        return;
    }
    if (!Array.isArray(data.registros)) {
        alert('O arquivo JSON não possui o formato correto de backup (esperado um campo "registros" como lista).');
        return;
    }

    if (!confirm('Atenção: A importação substituirá todos os registros atuais. Deseja continuar?')) return;

    let nextId = Date.now();
    const novos = [];
    const ignoradas = [];
    data.registros.forEach((r, i) => {
        if (!r || typeof r !== 'object') { ignoradas.push(i + 1); return; }
        const lessonName = typeof r.lessonName === 'string' ? r.lessonName.trim().slice(0, 100) : '';
        const date = typeof r.date === 'string' ? r.date.trim() : '';
        if (!lessonName || !dataIsoValida(date)) { ignoradas.push(i + 1); return; }
        novos.push({
            id: nextId++,
            lessonName,
            date,
            studentLevel: intNoIntervalo(r.studentLevel, 1, 4, 3),
            classLevel: intNoIntervalo(r.classLevel, 1, 4, 3)
        });
    });

    if (!novos.length) {
        alert('Nenhum registro válido encontrado no JSON. Nada foi importado.');
        return;
    }

    registros = novos;
    sortByDate(registros);
    salvar();
    renderizar();
    limparForm();
    const sufixo = ignoradas.length
        ? ` (${ignoradas.length} item(ns) ignorado(s): ${ignoradas.slice(0, 10).join(', ')}${ignoradas.length > 10 ? '…' : ''})`
        : '';
    alert('JSON importado com sucesso!' + sufixo);
}

function importarCSVAluno(rawText) {
    let text = rawText;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

    let rows;
    try {
        rows = parseCSV(text);
    } catch (err) {
        console.error('[Import CSV] parseCSV falhou', err);
        alert('Não foi possível interpretar o CSV. Verifique se o arquivo está íntegro e usa ";" como separador.');
        return;
    }

    if (rows.length < 2) {
        alert('CSV vazio: é preciso pelo menos o cabeçalho + 1 linha de dados.');
        return;
    }
    const header = rows[0];
    if (header[0] !== 'Data' || header[1] !== 'Aula') {
        alert('Cabeçalho do CSV inválido. Esperado começar com "Data;Aula;..." (use um arquivo exportado por este sistema).');
        return;
    }

    if (!confirm('Atenção: A importação substituirá todos os registros atuais. Deseja continuar?')) return;

    let nextId = Date.now();
    const novos = [];
    const ignoradas = [];
    for (let j = 1; j < rows.length; j++) {
        const row = rows[j];
        try {
            if (row.length < 4) { ignoradas.push(j + 1); continue; }
            const date = (row[0] || '').trim();
            const lessonName = (row[1] || '').trim().slice(0, 100);
            if (!lessonName || !dataIsoValida(date)) { ignoradas.push(j + 1); continue; }
            novos.push({
                id: nextId++,
                lessonName,
                date,
                studentLevel: intNoIntervalo(row[2], 1, 4, 3),
                classLevel: intNoIntervalo(row[3], 1, 4, 3)
            });
        } catch (err) {
            console.warn('[Import CSV] linha', j + 1, 'ignorada:', err);
            ignoradas.push(j + 1);
        }
    }

    if (!novos.length) {
        alert('Nenhuma linha válida encontrada no CSV. Nada foi importado.');
        return;
    }

    registros = novos;
    sortByDate(registros);
    salvar();
    renderizar();
    limparForm();
    const sufixo = ignoradas.length
        ? ` (${ignoradas.length} linha(s) ignorada(s): ${ignoradas.slice(0, 10).join(', ')}${ignoradas.length > 10 ? '…' : ''})`
        : '';
    alert('CSV importado com sucesso!' + sufixo);
}

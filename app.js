// App de gastos - guardado en localStorage
const STORAGE_KEY = 'mis_gastos_v1';

const expenseForm = document.getElementById('expenseForm');
const amountEl = document.getElementById('amount');
const categoryEl = document.getElementById('category');
const typeEl = document.getElementById('type');
const dateEl = document.getElementById('date');
const descriptionEl = document.getElementById('description');
const resetBtn = document.getElementById('resetBtn');

const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const filterCategory = document.getElementById('filterCategory');
const filterType = document.getElementById('filterType');
const applyFilters = document.getElementById('applyFilters');
const clearFilters = document.getElementById('clearFilters');

const expenseListEl = document.getElementById('expenseList');
const totalAmountEl = document.getElementById('totalAmount');
const byCategoryEl = document.getElementById('byCategory');
const toggleFormBtn = document.getElementById('toggleForm');

let expenses = loadExpenses();
let editId = null;
let chart = null;
let dailyChart = null;
let categoryChart = null;

function loadExpenses(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){
    console.error('Error leyendo storage', e);
    return [];
  }
}

function saveExpenses(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function renderExpenses(list){
  expenseListEl.innerHTML = '';
  if(list.length === 0){
    expenseListEl.innerHTML = '<p class="small">No hay gastos registrados.</p>';
    totalAmountEl.textContent = '€0.00';
    byCategoryEl.innerHTML = '';
    updateChart([]);
    return;
  }

  list.forEach(exp => {
    const div = document.createElement('div');
    div.className = 'expense-item';

    const meta = document.createElement('div');
    meta.className = 'expense-meta';
    const title = document.createElement('div');
    title.innerHTML = `<strong>€${exp.amount.toFixed(2)}</strong> <span class="small">• ${exp.category}</span>`;
    const sub = document.createElement('div');
    sub.className = 'small';
    sub.textContent = `${exp.date} — ${exp.description || ''}`;

    meta.appendChild(title);
    meta.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'expense-actions';
    const edit = document.createElement('button');
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => startEdit(exp.id));
    const del = document.createElement('button');
    del.textContent = 'Eliminar';
    del.className = 'secondary';
    del.addEventListener('click', () => deleteExpense(exp.id));

    actions.appendChild(edit);
    actions.appendChild(del);

    div.appendChild(meta);
    div.appendChild(actions);

    expenseListEl.appendChild(div);
  });

  updateTotals(list);
  updateChart(list);
  updateDailyChart(list);
  updateCategoryChart(list);
}

function updateTotals(list){
  // calcular ingresos, gastos y neto
  const totales = list.reduce((acc, e) => {
    if(e.type === 'Ingreso') acc.ingresos += Number(e.amount);
    else acc.gastos += Number(e.amount);
    acc.byCat[e.category] = (acc.byCat[e.category] || 0) + (e.type === 'Ingreso' ? Number(e.amount) : -Number(e.amount));
    return acc;
  }, { ingresos: 0, gastos: 0, byCat: {} });

  const net = totales.ingresos - totales.gastos;
  totalAmountEl.textContent = `€${net.toFixed(2)}`;

  byCategoryEl.innerHTML = '';
  Object.keys(totales.byCat).forEach(cat => {
    const val = totales.byCat[cat];
    const p = document.createElement('p');
    p.innerHTML = `<span class="small">${cat}:</span> <strong>€${val.toFixed(2)}</strong>`;
    byCategoryEl.appendChild(p);
  });
}

function addExpense(exp){
  expenses.push(exp);
  saveExpenses();
  renderExpenses(filterCurrent());
}

function startEdit(id){
  const exp = expenses.find(e => e.id === id);
  if(!exp) return;
  editId = id;
  amountEl.value = exp.amount;
  categoryEl.value = exp.category;
  dateEl.value = exp.date;
  descriptionEl.value = exp.description;
  amountEl.focus();
}

function applyEdit(id, updated){
  expenses = expenses.map(e => e.id === id ? Object.assign({}, e, updated) : e);
  saveExpenses();
  editId = null;
  renderExpenses(filterCurrent());
}

function deleteExpense(id){
  if(!confirm('¿Eliminar este gasto?')) return;
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  renderExpenses(filterCurrent());
}

function clearForm(){
  expenseForm.reset();
  editId = null;
  // fecha por defecto hoy
  dateEl.value = new Date().toISOString().slice(0,10);
}

function filterCurrent(){
  const from = filterFrom.value;
  const to = filterTo.value;
  const cat = filterCategory.value;
  const fType = filterType ? filterType.value : '';
  return expenses.filter(e => {
    if(from && e.date < from) return false;
    if(to && e.date > to) return false;
    if(cat && e.category !== cat) return false;
    if(fType && e.type !== fType) return false;
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date));
}

expenseForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const amount = Number(amountEl.value);
  const type = typeEl ? typeEl.value : 'Gasto';
  const category = categoryEl.value;
  const date = dateEl.value;
  const description = descriptionEl.value;
  if(!amount || !date) return alert('Completa monto y fecha');

  const item = { id: Date.now().toString(), amount, type, category, date, description };
  if(editId){
    applyEdit(editId, item);
  } else {
    addExpense(item);
  }
  clearForm();
});

resetBtn.addEventListener('click', clearForm);
applyFilters.addEventListener('click', () => renderExpenses(filterCurrent()));
clearFilters.addEventListener('click', () => { filterFrom.value=''; filterTo.value=''; filterCategory.value=''; if(filterType) filterType.value=''; renderExpenses(filterCurrent()); });
if(filterType){ filterType.addEventListener('change', () => renderExpenses(filterCurrent())); }

// Init
dateEl.value = new Date().toISOString().slice(0,10);
renderExpenses(filterCurrent());

// Chart.js summary
function updateChart(list){
  const totals = { Ingreso:0, Gasto:0 };
  list.forEach(e => { if(e.type === 'Ingreso') totals.Ingreso += Number(e.amount); else totals.Gasto += Number(e.amount); });
  const ctxEl = document.getElementById('summaryChart');
  if(!ctxEl) return;
  const ctx = ctxEl.getContext('2d');
  const data = {
    labels: ['Ingresos','Gastos'],
    datasets: [{
      label: '€',
      data: [totals.Ingreso, totals.Gasto],
      backgroundColor: ['#2ecc71','#e74c3c']
    }]
  };
  if(chart) { chart.data = data; chart.update(); return; }
  chart = new Chart(ctx, { type: 'bar', data, options: { responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } } });
}

// Toggle form
if(toggleFormBtn){
  toggleFormBtn.addEventListener('click', () => {
    const f = document.getElementById('expenseForm');
    if(f.classList.contains('hidden')){ f.classList.remove('hidden'); toggleFormBtn.textContent = '− Ocultar formulario'; }
    else { f.classList.add('hidden'); toggleFormBtn.textContent = '＋ Añadir gasto'; }
  });
}

function updateDailyChart(list){
  // últimos 30 días
  const days = [];
  const today = new Date();
  for(let i=29;i>=0;i--){
    const d = new Date(); d.setDate(today.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }
  const totalsByDay = days.map(day => {
    return list.filter(e => e.date === day).reduce((s, e) => s + (e.type === 'Ingreso' ? -Number(e.amount) : Number(e.amount)), 0);
  });
  const ctxEl = document.getElementById('dailyChart');
  if(!ctxEl) return;
  const ctx = ctxEl.getContext('2d');
  const data = { labels: days, datasets: [{ label: 'Gasto neto', data: totalsByDay, backgroundColor: '#3498db' }] };
  if(dailyChart){ dailyChart.data = data; dailyChart.update(); return; }
  dailyChart = new Chart(ctx, { type: 'bar', data, options:{ responsive:true, maintainAspectRatio:false, scales:{ x:{ ticks:{ maxRotation:0 } }, y:{ beginAtZero:true } } } });
}

function updateCategoryChart(list){
  const byCat = {};
  list.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + (e.type === 'Ingreso' ? -Number(e.amount) : Number(e.amount)); });
  const labels = Object.keys(byCat);
  const dataVals = labels.map(l => byCat[l]);
  const ctxEl = document.getElementById('categoryChart');
  if(!ctxEl) return;
  const ctx = ctxEl.getContext('2d');
  const data = { labels, datasets:[{ data: dataVals, backgroundColor: ['#f39c12','#e74c3c','#9b59b6','#2ecc71','#3498db'] }] };
  if(categoryChart){ categoryChart.data = data; categoryChart.update(); return; }
  categoryChart = new Chart(ctx, { type: 'doughnut', data, options:{ responsive:true, maintainAspectRatio:false } });
}

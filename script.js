const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const totalAmount = document.getElementById('totalAmount');
const expenseCount = document.getElementById('expenseCount');
const categoryCount = document.getElementById('categoryCount');
const lastExpense = document.getElementById('lastExpense');
const dailyChart = document.getElementById('dailyChart');
const categoryChart = document.getElementById('categoryChart');

const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const expenseIndexInput = document.getElementById('expenseIndex');
const submitButton = document.getElementById('submitButton');
const cancelEditButton = document.getElementById('cancelEdit');

const categoryColors = {
  Alimentación: '#6366f1',
  Transporte: '#f97316',
  Ocio: '#10b981',
  Hogar: '#ec4899',
  Otros: '#f59e0b'
};

const today = new Date().toISOString().slice(0, 10);
dateInput.value = today;

const storageKey = 'expenseTrackerData';
let expenses = JSON.parse(localStorage.getItem(storageKey) || '[]');

function saveExpenses() {
  localStorage.setItem(storageKey, JSON.stringify(expenses));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

function renderExpenses() {
  expenseList.innerHTML = '';
  if (expenses.length === 0) {
    expenseList.innerHTML = '<li class="expense-item"><div>No hay gastos aún. Añade el primero.</div></li>';
    expenseCount.textContent = '0';
    categoryCount.textContent = '0';
    lastExpense.textContent = 'N/A';
    totalAmount.textContent = formatCurrency(0);
    drawDailyChart([]);
    drawCategoryChart([]);
    return;
  }

  const sorted = expenses
    .map((expense, index) => ({ ...expense, originalIndex: index }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  let total = 0;
  const categories = new Set();
  sorted.forEach((expense) => {
    total += expense.amount;
    categories.add(expense.category);
    const item = document.createElement('li');
    item.className = 'expense-item';
    item.innerHTML = `
      <div class="expense-meta">
        <strong>${expense.description}</strong>
        <span>${expense.date} · <span class="tag">${expense.category}</span></span>
      </div>
      <div class="expense-actions">
        <button class="action-button edit-button" data-index="${expense.originalIndex}">Editar</button>
        <button class="action-button delete-button" data-index="${expense.originalIndex}">Eliminar</button>
      </div>
      <div class="expense-amount">
        <span>Cantidad</span>
        <strong>${formatCurrency(expense.amount)}</strong>
      </div>
    `;
    expenseList.appendChild(item);
  });

  totalAmount.textContent = formatCurrency(total);
  expenseCount.textContent = sorted.length.toString();
  categoryCount.textContent = categories.size.toString();
  lastExpense.textContent = sorted[0].description;

  drawDailyChart(expenses);
  drawCategoryChart(expenses);
}

function resetForm() {
  expenseForm.reset();
  dateInput.value = today;
  expenseIndexInput.value = '';
  submitButton.textContent = 'Añadir gasto';
  cancelEditButton.classList.add('hidden');
}

function addExpense(event) {
  event.preventDefault();
  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;
  const editingIndex = expenseIndexInput.value;

  if (!description || isNaN(amount) || amount <= 0 || !date) {
    return;
  }

  if (editingIndex !== '') {
    expenses[parseInt(editingIndex, 10)] = { description, amount, category, date };
  } else {
    expenses.push({ description, amount, category, date });
  }

  saveExpenses();
  renderExpenses();
  resetForm();
}

function deleteExpense(index) {
  expenses.splice(index, 1);
  saveExpenses();
  renderExpenses();
}

function editExpense(index) {
  const expense = expenses[index];
  descriptionInput.value = expense.description;
  amountInput.value = expense.amount;
  categoryInput.value = expense.category;
  dateInput.value = expense.date;
  expenseIndexInput.value = index;
  submitButton.textContent = 'Guardar cambios';
  cancelEditButton.classList.remove('hidden');
}

expenseList.addEventListener('click', (event) => {
  const deleteBtn = event.target.closest('.delete-button');
  const editBtn = event.target.closest('.edit-button');
  if (deleteBtn) {
    deleteExpense(parseInt(deleteBtn.dataset.index, 10));
    return;
  }
  if (editBtn) {
    editExpense(parseInt(editBtn.dataset.index, 10));
  }
});

cancelEditButton.addEventListener('click', resetForm);

function groupByDate(data) {
  const grouped = {};
  const dates = [];

  const todayDate = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(todayDate);
    day.setDate(todayDate.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    grouped[key] = 0;
    dates.push(key);
  }

  data.forEach((item) => {
    if (grouped[item.date] !== undefined) {
      grouped[item.date] += item.amount;
    }
  });

  return dates.map((date) => ({ date, amount: grouped[date] }));
}

function groupByCategory(data) {
  return data.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});
}

function drawDailyChart(data) {
  const ctx = dailyChart.getContext('2d');
  const dates = groupByDate(data);
  const maxValue = Math.max(...dates.map((item) => item.amount), 10);

  ctx.clearRect(0, 0, dailyChart.width, dailyChart.height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, dailyChart.width, dailyChart.height);

  const chartPadding = 40;
  const chartWidth = dailyChart.width - chartPadding * 2;
  const chartHeight = dailyChart.height - chartPadding * 2;

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 5; i += 1) {
    const y = chartPadding + (chartHeight / 5) * i;
    ctx.moveTo(chartPadding, y);
    ctx.lineTo(dailyChart.width - chartPadding, y);
  }
  ctx.stroke();

  const barWidth = chartWidth / dates.length * 0.6;
  dates.forEach((item, index) => {
    const x = chartPadding + (chartWidth / dates.length) * index + (chartWidth / dates.length - barWidth) / 2;
    const height = item.amount ? (item.amount / maxValue) * chartHeight : 0;
    const y = chartPadding + chartHeight - height;

    ctx.fillStyle = '#6366f1';
    ctx.fillRect(x, y, barWidth, height);

    ctx.fillStyle = '#374151';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.date.slice(5), x + barWidth / 2, dailyChart.height - 10);
  });
}

function drawCategoryChart(data) {
  const ctx = categoryChart.getContext('2d');
  const categories = groupByCategory(Array.isArray(data) ? data : []);
  const entries = Object.entries(categories);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  ctx.clearRect(0, 0, categoryChart.width, categoryChart.height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, categoryChart.width, categoryChart.height);

  if (entries.length === 0 || total === 0) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Añade gastos para ver el gráfico', categoryChart.width / 2, categoryChart.height / 2);
    return;
  }

  let startAngle = -Math.PI / 2;
  const centerX = categoryChart.width / 2;
  const centerY = categoryChart.height / 2;
  const radius = Math.min(centerX, centerY) - 40;

  entries.forEach(([category, value]) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = categoryColors[category] || '#cbd5e1';
    ctx.fill();
    startAngle += sliceAngle;
  });

  let labelAngle = -Math.PI / 2;
  entries.forEach(([category, value]) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const midAngle = labelAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(midAngle) * (radius + 20);
    const labelY = centerY + Math.sin(midAngle) * (radius + 20);

    ctx.fillStyle = '#111827';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = labelX < centerX ? 'right' : 'left';
    ctx.fillText(`${category} ${Math.round((value / total) * 100)}%`, labelX, labelY);
    labelAngle += sliceAngle;
  });
}

expenseForm.addEventListener('submit', addExpense);
renderExpenses();

let trendChart;

function makeChart(data) {
  const ctx = document.getElementById('trendChart');
  const maxLength = Math.max((data.order_history || []).length, (data.alert_history || []).length, 1);
  const labels = Array.from({ length: maxLength }, (_, index) => index + 1);
  const orderValues = (data.order_history || []).map(item => Number(item.value || 0));
  const alertValues = (data.alert_history || []).map(item => Number(item.value || 0));

  if (trendChart) {
    trendChart.destroy();
  }

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Orders',
          data: orderValues,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.18)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: 'Alerts',
          data: alertValues,
          borderColor: '#f87171',
          backgroundColor: 'rgba(248, 113, 113, 0.14)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#cbd5e1',
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          grid: { color: 'rgba(148, 163, 184, 0.08)' },
          ticks: { color: '#94a3b8', maxTicksLimit: 6 }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.08)' },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    render(data);
  } catch (err) {
    const statusBadge = document.getElementById('status-pill');
    statusBadge.textContent = 'Disconnected';
    statusBadge.style.background = 'rgba(248, 113, 113, 0.12)';
    statusBadge.style.color = '#fca5a5';
  }
}

function render(data) {
  const statusBadge = document.getElementById('status-pill');
  const incidentBadge = document.getElementById('live-incident');
  const healthState = (data.system_health && data.system_health.alerts) || 'healthy';
  const statusClassMap = {
    healthy: 'state-healthy',
    warning: 'state-warning',
    critical: 'state-critical',
    idle: 'state-idle'
  };

  document.getElementById('hero-state').textContent = data.status === 'running' ? 'Monitoring' : 'Syncing';
  document.getElementById('hero-risk').textContent = healthState === 'critical' ? 'Critical' : healthState === 'warning' ? 'Warning' : 'Stable';

  statusBadge.className = 'status-pill ' + (statusClassMap[healthState] || 'state-healthy');
  incidentBadge.classList.toggle('hidden', !(healthState === 'warning' || healthState === 'critical'));

  const severityBanner = document.getElementById('severity-banner');
  const severityText = {
    healthy: 'Incident severity: Healthy',
    warning: 'Incident severity: Warning — abnormal pattern detected',
    critical: 'Incident severity: Critical — automatic response triggered',
    idle: 'Incident severity: Idle — waiting for stream traffic'
  };

  if (severityBanner) {
    severityBanner.textContent = severityText[healthState] || severityText.healthy;
    severityBanner.classList.toggle('hidden', data.status !== 'running');
    severityBanner.classList.toggle('critical', healthState === 'critical');
    severityBanner.classList.toggle('warning', healthState === 'warning');
  }

  if (data.status === 'running') {
    statusBadge.textContent = healthState === 'critical' ? 'Critical Alert' : healthState === 'warning' ? 'Warning' : 'Live';
    incidentBadge.textContent = healthState === 'critical' ? 'Live incident' : 'Live incident';
  } else {
    statusBadge.textContent = 'Checking...';
    statusBadge.className = 'status-pill state-warning';
    incidentBadge.classList.add('hidden');
  }

  const alertLoad = Math.min(100, Math.round(((data.total_alerts || 0) / Math.max((data.total_orders || 0) + (data.total_alerts || 0), 1)) * 100));
  const progressFill = document.getElementById('alert-progress-fill');
  const alertLoadText = document.getElementById('alert-load-text');
  progressFill.style.width = `${alertLoad}%`;
  progressFill.style.background = healthState === 'critical' ? 'linear-gradient(90deg, #f87171, #fca5a5)' : healthState === 'warning' ? 'linear-gradient(90deg, #fbbf24, #fcd34d)' : 'linear-gradient(90deg, #34d399, #60a5fa)';
  alertLoadText.textContent = `${alertLoad}%`;

  document.body.classList.toggle('critical-mode', healthState === 'critical');
  document.body.classList.toggle('warning-mode', healthState === 'warning');
  document.body.classList.toggle('healthy-mode', healthState === 'healthy' || healthState === 'idle');

  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    card.classList.remove('severity-healthy', 'severity-warning', 'severity-critical');
    const level = healthState === 'critical' ? 'severity-critical' : healthState === 'warning' ? 'severity-warning' : 'severity-healthy';
    card.classList.add(level);
    if (card.classList.contains('accent-red')) {
      card.classList.toggle('critical-card', healthState === 'critical');
      card.classList.toggle('warning-card', healthState === 'warning');
    }
  });

  const panelList = document.querySelectorAll('.panel, .cinematic-panel');
  panelList.forEach(panel => {
    panel.classList.remove('critical-mode', 'warning-mode', 'healthy-mode');
    if (healthState === 'critical') {
      panel.classList.add('critical-mode');
    } else if (healthState === 'warning') {
      panel.classList.add('warning-mode');
    } else {
      panel.classList.add('healthy-mode');
    }
  });

  document.getElementById('throughput').textContent = Number(data.throughput ?? 0).toFixed(2);
  document.getElementById('total-orders').textContent = data.total_orders ?? 0;
  document.getElementById('total-alerts').textContent = data.total_alerts ?? 0;
  document.getElementById('unique-users').textContent = data.unique_users ?? 0;

  const topUsers = document.getElementById('top-users');
  const topRules = document.getElementById('top-rules');

  topUsers.innerHTML = (data.top_users || []).length
    ? data.top_users.map(item => `
        <li><span class="tag">${item.userId}</span><span class="count">${item.count}</span></li>
      `).join('')
    : '<li><span class="tag">No users yet</span><span class="count">0</span></li>';

  topRules.innerHTML = (data.top_rules || []).length
    ? data.top_rules.map(item => `
        <li><span class="tag">${item.ruleCode}</span><span class="count">${item.count}</span></li>
      `).join('')
    : '<li><span class="tag">No alerts yet</span><span class="count">0</span></li>';

  const heatmap = document.getElementById('user-heatmap');
  heatmap.innerHTML = (data.alert_heatmap || []).length
    ? data.alert_heatmap.map(item => `
        <div class="heat-cell ${item.level || 'normal'}" title="${item.userId}: ${item.ratio} alert ratio (${item.alertCount}/${item.orderCount})">
          <span>${item.userId.split('-').slice(-1)[0]}</span>
          <span class="ratio">${Number(item.ratio || 0).toFixed(2)}</span>
        </div>
      `).join('')
    : '<div class="heat-cell normal"><span>Idle</span><span class="ratio">0.00</span></div>';

  const healthList = document.getElementById('system-health');
  const healthMap = data.system_health || {};
  const healthEntries = [
    ['Pipeline', healthMap.pipeline || 'idle'],
    ['Kafka', healthMap.kafka || 'idle'],
    ['Storage', healthMap.storage || 'warming'],
    ['Alerts', healthMap.alerts || 'healthy'],
  ];

  healthList.innerHTML = healthEntries.map(([label, state]) => `
    <div class="health-item">
      <span>${label}</span>
      <span class="health-state ${state}">${state}</span>
    </div>
  `).join('');

  const timeline = document.getElementById('incident-timeline');
  const liveEvents = (data.recent_alerts || []).slice(-3).reverse();
  const fallbackEvents = [
    { ruleCode: 'Kafka broker online', severity: 'INFO', userId: 'system', timestamp: Date.now() - 55000 },
    { ruleCode: 'Velocity anomaly', severity: 'WARNING', userId: 'user-42', timestamp: Date.now() - 32000 },
    { ruleCode: 'Chargeback escalation', severity: 'CRITICAL', userId: 'user-19', timestamp: Date.now() - 12000 },
  ];
  const events = liveEvents.length ? liveEvents : fallbackEvents;
  if (timeline) {
    timeline.innerHTML = events.map(item => {
      const severity = (item.severity || 'INFO').toUpperCase();
      const label = severity === 'CRITICAL' ? 'critical' : severity === 'WARNING' ? 'warning' : 'info';
      const time = new Date(Number(item.timestamp) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const title = item.ruleCode || (severity === 'CRITICAL' ? 'Escalation triggered' : severity === 'WARNING' ? 'Velocity anomaly' : 'System online');
      const userText = item.userId && item.userId !== 'system' ? `${item.userId} · ` : '';
      return `
        <div class="timeline-item ${label}">
          <span class="timeline-dot"></span>
          <div>
            <strong>${title}</strong>
            <small>${userText}${time}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  const healthStateClass = healthMap.alerts || 'healthy';
  const alarmTone = {
    healthy: 'rgba(52, 211, 153, 0.08)',
    warning: 'rgba(251, 191, 36, 0.14)',
    critical: 'rgba(248, 113, 113, 0.16)',
    idle: 'rgba(148, 163, 184, 0.08)'
  };
  const root = document.documentElement;
  root.style.setProperty('--alert-dynamic-bg', alarmTone[healthStateClass] || alarmTone.healthy);

  makeChart(data);

  const ordersBody = document.getElementById('orders-body');
  const alertsBody = document.getElementById('alerts-body');

  ordersBody.innerHTML = (data.recent_orders || []).length
    ? data.recent_orders.map(item => {
        const time = new Date(Number(item.timestamp) || Date.now()).toLocaleTimeString();
        return `
          <tr>
            <td>${time}</td>
            <td>${item.userId || 'unknown'}</td>
            <td>${item.actionType || 'UNKNOWN'}</td>
            <td>${item.amount || 0}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="4">No order data yet</td></tr>';

  alertsBody.innerHTML = (data.recent_alerts || []).length
    ? data.recent_alerts.map(item => {
        const time = new Date(Number(item.timestamp) || Date.now()).toLocaleTimeString();
        const severity = (item.severity || 'INFO').toUpperCase();
        const rowClass = severity === 'CRITICAL' ? 'critical' : severity === 'WARNING' ? 'warning' : 'info';
        return `
          <tr class="alert-row ${rowClass}">
            <td>${time}</td>
            <td>${item.userId || 'unknown'}</td>
            <td>${item.ruleCode || 'UNKNOWN'}</td>
            <td>${severity}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="4">No alert data yet</td></tr>';
}

document.getElementById('presentation-toggle')?.addEventListener('click', () => {
  document.body.classList.toggle('presentation-mode');
  const button = document.getElementById('presentation-toggle');
  button.textContent = document.body.classList.contains('presentation-mode') ? 'Exit fullscreen' : 'Fullscreen';
});

fetchStatus();
setInterval(fetchStatus, 2000);

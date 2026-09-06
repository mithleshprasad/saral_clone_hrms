
export async function loadAnalytics() {
    console.log("Loading Analytics Dashboard...");
    const content = document.getElementById('content-area');

    // Skeleton UI
    content.innerHTML = `
        <div class="analytics-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin:0;">Company Analytics</h2>
                <button class="erp-btn" onclick="loadAnalytics()">Refresh Data</button>
            </div>

            <div class="charts-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px;">

                <!-- Card 1: Employee Status -->
                <div class="card" style="padding: 15px;">
                    <h3>Employment Status</h3>
                    <div style="height: 300px; position: relative;">
                        <canvas id="chart-status"></canvas>
                        <div id="chart-status-empty" class="chart-empty-msg" style="display:none;">No employee data available</div>
                    </div>
                </div>

                <!-- Card 2: Attendance This Month -->
                <div class="card" style="padding: 15px;">
                    <h3>Attendance Overview (This Month)</h3>
                    <div style="height: 300px; position: relative;">
                        <canvas id="chart-attendance"></canvas>
                        <div id="chart-attendance-empty" class="chart-empty-msg" style="display:none;">No attendance marked this month</div>
                    </div>
                </div>

                <!-- Card 3: Salary Distribution -->
                <div class="card" style="padding: 15px; grid-column: 1 / -1;">
                    <h3>Salary Distribution by Department</h3>
                    <div style="height: 300px; position: relative;">
                        <canvas id="chart-salary"></canvas>
                        <div id="chart-salary-empty" class="chart-empty-msg" style="display:none;">No salary data available</div>
                    </div>
                </div>

                  <!-- Card 4: Growth -->
                <div class="card" style="padding: 15px; grid-column: 1 / -1;">
                    <h3>Hiring Growth (Last 6 Months)</h3>
                    <div style="height: 300px; position: relative;">
                        <canvas id="chart-growth"></canvas>
                        <div id="chart-growth-empty" class="chart-empty-msg" style="display:none;">No hiring activity in the last 6 months</div>
                    </div>
                </div>

            </div>
        </div>
    `;

    try {
        const data = await window.electronAPI.invoke('get-analytics-stats');
        console.log("Analytics Data:", data);

        if (!window.Chart) {
            console.error("Chart.js not loaded!");
            content.innerHTML += `<div class="error">Error: Chart.js library not found.</div>`;
            return;
        }

        // 1. Status Chart
        const statusTotal = data.empStatus.reduce((s, x) => s + x.count, 0);
        if (statusTotal === 0) {
            document.getElementById('chart-status-empty').style.display = 'flex';
        } else {
            new Chart(document.getElementById('chart-status'), {
                type: 'doughnut',
                data: {
                    labels: data.empStatus.map(x => x.status || 'Unknown'),
                    datasets: [{
                        data: data.empStatus.map(x => x.count),
                        backgroundColor: ['#15803d', '#b91c1c', '#b45309', '#004b91']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // 2. Attendance Chart — sum each status directly rather than deriving "absent"
        // by subtraction, which breaks once attendance is aggregated over a whole month
        // (present-day-count can exceed the active-employee-count used for that estimate).
        const presentLike = ['Present', 'P', 'Weekly Off', 'WO', 'Half Day', 'HD'];
        const present = data.attendance.filter(x => presentLike.includes(x.status)).reduce((s, x) => s + x.count, 0);
        const absent = data.attendance.filter(x => !presentLike.includes(x.status)).reduce((s, x) => s + x.count, 0);

        if (present + absent === 0) {
            document.getElementById('chart-attendance-empty').style.display = 'flex';
        } else {
            new Chart(document.getElementById('chart-attendance'), {
                type: 'pie',
                data: {
                    labels: ['Present / WO', 'Absent / Leave'],
                    datasets: [{
                        data: [present, absent],
                        backgroundColor: ['#15803d', '#e2e8f0']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // 3. Salary Chart
        const salaryTotal = data.salaryByDept.reduce((s, x) => s + (x.total || 0), 0);
        if (data.salaryByDept.length === 0 || salaryTotal === 0) {
            document.getElementById('chart-salary-empty').style.display = 'flex';
        } else {
            new Chart(document.getElementById('chart-salary'), {
                type: 'bar',
                data: {
                    labels: data.salaryByDept.map(x => x.department || 'Unassigned'),
                    datasets: [{
                        label: 'Total Salary Expenditure',
                        data: data.salaryByDept.map(x => x.total),
                        backgroundColor: '#004b91',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // 4. Growth Chart (Line)
        const growthTotal = data.growth.reduce((s, x) => s + (x.joined || 0), 0);
        if (growthTotal === 0) {
            document.getElementById('chart-growth-empty').style.display = 'flex';
        } else {
            new Chart(document.getElementById('chart-growth'), {
                type: 'line',
                data: {
                    labels: data.growth.map(x => x.month),
                    datasets: [{
                        label: 'New Hires',
                        data: data.growth.map(x => x.joined),
                        borderColor: '#004b91',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(0, 75, 145, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

    } catch (err) {
        console.error("Render Error:", err);
        window.showToast("Failed to load analytics: " + err.message, 'error');
    }
}

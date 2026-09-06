const Dashboard = require('../models/Dashboard.model');
const { todayLocal } = require('../utils/dateUtils');

module.exports = {
    async stats(companyId) {
        const today = todayLocal();
        const currentMonth = new Date().getMonth() + 1;
        const nextMonth = (currentMonth % 12) + 1;

        const [totalEmployees, departments, presentToday, deptDist, recentHires, upcomingBirthdays] = await Promise.all([
            Dashboard.totalEmployees(companyId),
            Dashboard.totalDepartments(companyId),
            Dashboard.presentToday(today, companyId),
            Dashboard.departmentDistribution(companyId),
            Dashboard.recentHires(companyId),
            Dashboard.upcomingBirthdays(currentMonth, nextMonth, companyId),
        ]);

        return { totalEmployees, departments, presentToday, deptDist, recentHires, upcomingBirthdays };
    },

    async employeeStats(companyId) {
        const [byDept, byStatus] = await Promise.all([
            Dashboard.employeesByDepartment(companyId),
            Dashboard.employeesByStatus(companyId),
        ]);
        return { byDept, byStatus };
    },

    async payrollStats(companyId) {
        const [totals, monthly] = await Promise.all([
            Dashboard.payrollTotals(companyId),
            Dashboard.payrollMonthly(companyId),
        ]);
        return { totals, monthly };
    },
};

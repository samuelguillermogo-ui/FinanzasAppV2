/* =============================================
   HELPERS & UTILITIES
   ============================================= */

const Helpers = {
    /**
     * Generate a UUID v4
     */
    uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Format currency amount
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('es-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    },

    /**
     * Format date to locale string
     */
    formatDate(dateStr) {
        if (!dateStr) return '—';
        // Handle YYYY-MM-DD format manually to avoid UTC shift
        if (typeof dateStr === 'string' && dateStr.includes('-')) {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    /**
     * Format date for input fields
     */
    formatDateInput(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        // If it's a date-only string, return as is
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }
        // Otherwise format to YYYY-MM-DD local
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Get current date as YYYY-MM-DD
     */
    today() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Calculate days between two dates
     */
    daysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diff = d2 - d1;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    /**
     * Get month name
     */
    getMonthName(monthIndex) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return months[monthIndex];
    },

    /**
     * Get full month name
     */
    getFullMonthName(monthIndex) {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[monthIndex];
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    /**
     * Open modal
     */
    openModal(title, bodyHtml) {
        const overlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        overlay.classList.add('active');
    },

    /**
     * Close modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
    },

    /**
     * Export data to CSV
     */
    exportCSV(data, filename) {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            const values = headers.map(h => {
                const val = row[h] ?? '';
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });
        const csvString = csvRows.join('\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    /**
     * Debounce function
     */
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }
};

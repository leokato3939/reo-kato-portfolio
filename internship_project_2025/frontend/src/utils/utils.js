// JavaScript 工具函数

// 显示QR码功能
function showQRCode() {
    alert('QRコード機能は現在保留中です');
}

// 显示避难所信息模态框
function showShelterInfo(medication) {
    const modal = document.getElementById('shelterModal');
    const modalTitle = document.getElementById('modalTitle');
    const shelterList = document.getElementById('shelterList');
    
    modalTitle.textContent = `${medication} - 避難所情報`;
    
    // 示例数据
    const shelters = [
        { name: '○○避難所A', stock: '充足 (50本)' },
        { name: '○○避難所B', stock: '注意 (15本)' },
        { name: '○○避難所C', stock: '不足 (3本)' },
        { name: '○○避難所D', stock: '充足 (30本)' }
    ];
    
    shelterList.innerHTML = '';
    shelters.forEach(shelter => {
        const item = document.createElement('div');
        item.className = 'shelter-item';
        item.innerHTML = `
            <span class="shelter-name">${shelter.name}</span>
            <span class="shelter-stock">${shelter.stock}</span>
        `;
        shelterList.appendChild(item);
    });
    
    modal.style.display = 'block';
}

// 关闭模态框
function closeModal() {
    document.getElementById('shelterModal').style.display = 'none';
}

// 页面导航
function navigateTo(page) {
    window.location.href = page;
}

// 返回上一页
function goBack() {
    window.history.back();
}

// 显示成功消息
function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// 显示错误消息
function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// 格式化日期
function formatDate(date) {
    return new Date(date).toLocaleDateString('ja-JP');
}

// 格式化时间
function formatTime(date) {
    return new Date(date).toLocaleTimeString('ja-JP');
}

// 初始化页面
function initPage() {
    // 模态框外点击关闭
    window.onclick = function(event) {
        const modal = document.getElementById('shelterModal');
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
    
    // 添加浮动QR按钮（如果页面需要）
    if (document.querySelector('.qr-button')) {
        document.querySelector('.qr-button').addEventListener('click', showQRCode);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage); 
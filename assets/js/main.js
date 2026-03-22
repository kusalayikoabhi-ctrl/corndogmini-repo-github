// ============================================================
// DATABASE TERPUSAT (localStorage)
// ============================================================
const DB_KEYS = {
    reviews: 'dogmini_reviews',
    products: 'dogmini_products',
    botReplies: 'dogmini_botReplies',
    orders: 'dogmini_orders',
    video: 'dogmini_video',
    stats: 'dogmini_stats'
};

// Data default hardcoded (pre-loaded ke db jika belum ada)
const DEFAULT_REVIEWS = [];

const DEFAULT_BOT_REPLIES = [
    { keyword: 'buka', response: 'Dogmini buka setiap hari dari jam 10.00 pagi sampai 17.00 sore kak! ⏰' },
    { keyword: 'halo', response: 'Halo juga kak! Ada yang mau ditanyakan seputar Dogmini? 😊' },
    { keyword: 'harga', response: 'Harga mulai dari Rp 15.000 untuk Paket Mini (5 pcs). Ada juga Paket Santai Rp 28.000 dan Paket Party Rp 54.000 kak! 🌭' }
];

const db = {
    get(key) {
        try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
    },
    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },
    init() {
        // Reviews: seed default jika belum pernah ada
        if (!this.get(DB_KEYS.reviews)) {
            this.save(DB_KEYS.reviews, DEFAULT_REVIEWS);
        }
        // Products: kosong by default
        if (!this.get(DB_KEYS.products)) {
            this.save(DB_KEYS.products, []);
        }
        // Bot replies: seed default
        if (!this.get(DB_KEYS.botReplies)) {
            this.save(DB_KEYS.botReplies, DEFAULT_BOT_REPLIES);
        } else {
            let replies = this.get(DB_KEYS.botReplies);
            let updated = false;
            for (let r of replies) {
                if (r.keyword === 'buka' && r.response.includes('10.00 malam')) {
                    r.response = 'Dogmini buka setiap hari dari jam 10.00 pagi sampai 17.00 sore kak! ⏰';
                    updated = true;
                }
            }
            if (updated) this.save(DB_KEYS.botReplies, replies);
        }
        // Orders: kosong
        if (!this.get(DB_KEYS.orders)) {
            this.save(DB_KEYS.orders, []);
        }
        // Video: kosong by default
        if (!this.get(DB_KEYS.video)) {
            this.save(DB_KEYS.video, null);
        }
        // Stats: init if not exists
        if (!this.get(DB_KEYS.stats)) {
            this.save(DB_KEYS.stats, { totalVisits: 0, firstVisit: Date.now(), visitLog: [] });
        }
        // Increment visit count and log timestamp
        const stats = this.get(DB_KEYS.stats);
        stats.totalVisits++;
        stats.lastVisit = Date.now();
        if (!stats.visitLog) stats.visitLog = [];
        stats.visitLog.push(Date.now());
        // Keep only last 90 days of visit log to save space
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        stats.visitLog = stats.visitLog.filter(t => t > ninetyDaysAgo);
        this.save(DB_KEYS.stats, stats);
    },
    getReviews() { return this.get(DB_KEYS.reviews) || []; },
    getProducts() { return this.get(DB_KEYS.products) || []; },
    getBotReplies() { return this.get(DB_KEYS.botReplies) || []; },
    getOrders() { return this.get(DB_KEYS.orders) || []; },
    getVideo() { return this.get(DB_KEYS.video) || null; },
    addReview(r) { const all = this.getReviews(); all.push(r); this.save(DB_KEYS.reviews, all); },
    saveProducts(p) { this.save(DB_KEYS.products, p); },
    saveBotReplies(b) { this.save(DB_KEYS.botReplies, b); },
    addOrder(o) { const all = this.getOrders(); all.push(o); this.save(DB_KEYS.orders, all); },
    saveVideo(url) { this.save(DB_KEYS.video, url); },
    getStats() { return this.get(DB_KEYS.stats) || { totalVisits: 0, firstVisit: Date.now(), visitLog: [] }; }
};

// ============================================================
// GLOBAL STATE
// ============================================================
let cart = [];
let orders = [];
let isAdmin = false;
let appliedVoucher = null;
let discountAmount = 0;

// Review state
let reviewCurrentFilter = 'all';
let reviewVisibleCount = 6;
const REVIEWS_PER_PAGE = 6;

// Admin state
let isAdminLoggedIn = false;
let editingProductId = null;
let editingKeyword = null;

// Avatar colors
const AVATAR_COLORS = [
    'from-purple-500 to-indigo-500', 'from-pink-500 to-rose-500',
    'from-blue-500 to-cyan-500', 'from-green-500 to-emerald-500',
    'from-amber-500 to-orange-500', 'from-teal-500 to-cyan-500',
    'from-violet-500 to-purple-500', 'from-red-500 to-pink-500',
    'from-lime-500 to-green-500', 'from-indigo-500 to-blue-500'
];

// Default Config
const defaultConfig = {
    hero_title: 'Corndog Mini Terenak!',
    hero_subtitle: 'Nikmati sensasi corndog mini yang crispy di luar, lembut di dalam dengan keju meleleh yang menggoda. Cocok untuk segala suasana! 🧀✨',
    whatsapp_number: '082283323898',
    primary_action_color: '#ff6b35',
    secondary_action_color: '#f7931e'
};

// Data handler for dataSdk
const dataHandler = {
    onDataChanged(data) {
        orders = data.filter(item => item.type === 'order');
        if (isAdmin) renderAdminOrders();
    }
};

// ============================================================
// INIT
// ============================================================
async function initApp() {
    db.init();

    if (window.elementSdk) {
        window.elementSdk.init({
            defaultConfig,
            onConfigChange: async (config) => {
                const heroTitle = document.getElementById('heroTitle');
                if (heroTitle) heroTitle.innerHTML = `< span class="bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent" > ${config.hero_title || defaultConfig.hero_title}</span > `;
                const heroSubtitle = document.getElementById('heroSubtitle');
                if (heroSubtitle) heroSubtitle.textContent = config.hero_subtitle || defaultConfig.hero_subtitle;
            },
            mapToCapabilities: (config) => ({
                recolorables: [
                    { get: () => config.primary_action_color || defaultConfig.primary_action_color, set: (v) => { config.primary_action_color = v; window.elementSdk.setConfig({ primary_action_color: v }); } },
                    { get: () => config.secondary_action_color || defaultConfig.secondary_action_color, set: (v) => { config.secondary_action_color = v; window.elementSdk.setConfig({ secondary_action_color: v }); } }
                ],
                borderables: [], fontEditable: undefined, fontSizeable: undefined
            }),
            mapToEditPanelValues: (config) => new Map([
                ['hero_title', config.hero_title || defaultConfig.hero_title],
                ['hero_subtitle', config.hero_subtitle || defaultConfig.hero_subtitle],
                ['whatsapp_number', config.whatsapp_number || defaultConfig.whatsapp_number]
            ])
        });
    }

    if (window.dataSdk) {
        const result = await window.dataSdk.init(dataHandler);
        if (!result.isOk) console.error('Failed to initialize Data SDK');
    }

    createStars();
    initScrollAnimations();
    updateCartUI();
    renderReviews();
    renderPromoVideo();
    renderVisitorStats();
}

// ============================================================
// VISITOR STATISTICS
// ============================================================
function renderVisitorStats() {
    const stats = db.getStats();
    const now = new Date();
    const visitLog = stats.visitLog || [];

    // Calculate today's visits
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayVisits = visitLog.filter(t => t >= startOfToday).length;

    // Calculate this week's visits (Monday as start)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday=0
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek).getTime();
    const weekVisits = visitLog.filter(t => t >= startOfWeek).length;

    // Calculate this month's visits
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthVisits = visitLog.filter(t => t >= startOfMonth).length;

    const totalVisitsEl = document.getElementById('statTotalVisits');
    const todayEl = document.getElementById('statTodayVisits');
    const weekEl = document.getElementById('statWeekVisits');
    const monthEl = document.getElementById('statMonthVisits');
    const firstVisitEl = document.getElementById('statFirstVisit');
    const lastVisitEl = document.getElementById('statLastVisit');

    if (totalVisitsEl) totalVisitsEl.textContent = stats.totalVisits.toLocaleString('id-ID');
    if (todayEl) todayEl.textContent = todayVisits.toLocaleString('id-ID');
    if (weekEl) weekEl.textContent = weekVisits.toLocaleString('id-ID');
    if (monthEl) monthEl.textContent = monthVisits.toLocaleString('id-ID');
    if (firstVisitEl) firstVisitEl.textContent = new Date(stats.firstVisit).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    if (lastVisitEl) lastVisitEl.textContent = new Date(stats.lastVisit || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// STARS & ANIMATIONS
// ============================================================
function createStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return;
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.opacity = Math.random() * 0.5 + 0.2;
        starsContainer.appendChild(star);
    }
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale').forEach(el => observer.observe(el));
}

// ============================================================
// NAVIGATION
// ============================================================
function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}
function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('hidden');
}

// ============================================================
// CART
// ============================================================
function addToCart(id, name, price, quantity) {
    const existing = cart.find(item => item.id === id);
    if (existing) { existing.count++; } else { cart.push({ id, name, price, quantity, count: 1 }); }
    updateCartUI();
    showToast('✅', `${name} ditambahkan ke keranjang!`);
}
function removeFromCart(id) {
    const idx = cart.findIndex(item => item.id === id);
    if (idx > -1) { if (cart[idx].count > 1) cart[idx].count--; else cart.splice(idx, 1); }
    updateCartUI();
}
function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const total = cart.reduce((s, i) => s + i.count, 0);
    if (total > 0) { badge.textContent = total; badge.classList.remove('hidden'); } else { badge.classList.add('hidden'); }
}
function renderCartItems() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartSummary = document.getElementById('cartSummary');
    if (cart.length === 0) { cartItemsEl.innerHTML = ''; cartEmpty.classList.remove('hidden'); cartSummary.classList.add('hidden'); return; }
    cartEmpty.classList.add('hidden'); cartSummary.classList.remove('hidden');
    let subtotal = 0, totalPcs = 0;
    cartItemsEl.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.count;
        subtotal += itemTotal; totalPcs += item.quantity * item.count;
        return `< div class="glass rounded-xl p-4 flex items-center gap-4" ><div class="text-3xl">🌭</div><div class="flex-1"><h4 class="font-semibold">${item.name}</h4><p class="text-white/60 text-sm">${item.quantity} pcs × ${item.count}</p></div><div class="text-right"><div class="font-semibold text-orange-400">Rp ${itemTotal.toLocaleString('id-ID')}</div><div class="flex items-center gap-2 mt-2"><button onclick="removeFromCart('${item.id}')" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">-</button><span class="w-8 text-center">${item.count}</span><button onclick="addToCart('${item.id}','${item.name}',${item.price},${item.quantity})" class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center">+</button></div></div></div > `;
    }).join('');
    document.getElementById('cartSubtotal').textContent = `Rp ${subtotal.toLocaleString('id-ID')} `;
    document.getElementById('cartTotalItems').textContent = `${totalPcs} pcs`;
}
function openCart() { document.getElementById('cartModal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; renderCartItems(); }
function closeCart() { document.getElementById('cartModal').classList.add('hidden'); document.body.style.overflow = ''; }

// ============================================================
// CHECKOUT
// ============================================================
function proceedToCheckout() {
    if (!cart.length) return;
    closeCart();
    document.getElementById('checkoutModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderCheckoutItems();
}
function closeCheckout() {
    document.getElementById('checkoutModal').classList.add('hidden');
    document.body.style.overflow = '';
    appliedVoucher = null; discountAmount = 0;
    const codeInput = document.getElementById('voucherCode'); if (codeInput) codeInput.value = '';
    const msg = document.getElementById('voucherMessage'); if (msg) msg.classList.add('hidden');
}
function applyVoucher() {
    const codeInput = document.getElementById('voucherCode'); if (!codeInput) return;
    const code = codeInput.value.trim().toUpperCase();
    const messageEl = document.getElementById('voucherMessage');
    if (!code) { messageEl.textContent = 'Masukkan kode voucher terlebih dahulu!'; messageEl.className = 'text-xs text-red-400 block mt-2'; appliedVoucher = null; renderCheckoutItems(); return; }
    if (code === 'AKY111') {
        let eligible = 0, found = false;
        cart.forEach(item => { if (item.id === 'santai' || item.id === 'party') { eligible += item.price * item.count; found = true; } });
        if (found) { appliedVoucher = code; messageEl.textContent = 'Voucher berhasil diterapkan! Diskon 10% untuk Paket Santai & Party.'; messageEl.className = 'text-xs text-green-400 block mt-2'; }
        else { appliedVoucher = null; messageEl.textContent = 'Voucher hanya berlaku untuk Paket Santai dan Paket Party.'; messageEl.className = 'text-xs text-red-400 block mt-2'; }
    } else { appliedVoucher = null; messageEl.textContent = 'Kode voucher tidak valid!'; messageEl.className = 'text-xs text-red-400 block mt-2'; }
    renderCheckoutItems();
}
function renderCheckoutItems() {
    const container = document.getElementById('checkoutItems');
    let subtotal = 0, eligibleSubtotal = 0;
    if (container) {
        container.innerHTML = cart.map(item => {
            const t = item.price * item.count; subtotal += t;
            if (item.id === 'santai' || item.id === 'party') eligibleSubtotal += t;
            return `< div class="flex items-center gap-3" ><span class="text-2xl">🌭</span><div class="flex-1"><div class="font-medium">${item.name}</div><div class="text-white/60 text-sm">${item.quantity} pcs × ${item.count}</div></div><div class="font-semibold">Rp ${t.toLocaleString('id-ID')}</div></div > `;
        }).join('');
    }
    discountAmount = 0;
    const discountRow = document.getElementById('discountRow');
    if (appliedVoucher === 'AKY111') {
        discountAmount = eligibleSubtotal * 0.10;
        if (discountRow) { discountRow.classList.remove('hidden'); const el = document.getElementById('checkoutDiscount'); if (el) el.textContent = `- Rp ${discountAmount.toLocaleString('id-ID')} `; }
    } else { if (discountRow) discountRow.classList.add('hidden'); }
    const total = subtotal - discountAmount;
    let deliveryText = '';
    const deliveryInput = document.querySelector('input[name="delivery"]:checked');
    if (deliveryInput) deliveryText = deliveryInput.value === 'takeaway' ? 'Gratis' : 'Sesuai Aplikasi';
    const deliveryRow = document.getElementById('deliveryRow');
    if (deliveryRow) { if (deliveryText) { deliveryRow.classList.remove('hidden'); const el = document.getElementById('checkoutDelivery'); if (el) el.textContent = deliveryText; } else { deliveryRow.classList.add('hidden'); } }
    const subtotalEl = document.getElementById('checkoutSubtotal'); if (subtotalEl) subtotalEl.textContent = `Rp ${subtotal.toLocaleString('id-ID')} `;
    const totalEl = document.getElementById('checkoutTotal'); if (totalEl) totalEl.textContent = `Rp ${total.toLocaleString('id-ID')} `;
}
async function submitOrder(e) {
    e.preventDefault();
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const payment = document.querySelector('input[name="payment"]:checked')?.value;
    const delivery = document.querySelector('input[name="delivery"]:checked')?.value;
    if (!name || !phone || !address || !delivery) { showToast('❌', 'Mohon lengkapi semua data!'); return; }
    const orderItems = cart.map(i => `${i.name} (${i.quantity} pcs × ${i.count})`).join(', ');
    const subtotal = cart.reduce((s, i) => s + (i.price * i.count), 0);
    const total = subtotal - discountAmount;
    const totalPcs = cart.reduce((s, i) => s + (i.quantity * i.count), 0);
    const orderData = { id: Date.now().toString(), type: 'order', product_name: orderItems, quantity: totalPcs, price: total, customer_name: name, customer_phone: phone, customer_address: address, payment_method: payment, delivery_method: delivery, status: 'pending', created_at: new Date().toISOString() };
    // Save to dataSdk if available, else save locally
    if (window.dataSdk) {
        if (orders.length >= 999) { showToast('❌', 'Penyimpanan penuh!'); return; }
        const result = await window.dataSdk.create(orderData);
        if (!result.isOk) { showToast('❌', 'Gagal menyimpan pesanan!'); return; }
    } else {
        db.addOrder(orderData);
    }
    const paymentDetails = {
        seabank: { name: 'SeaBank', number: 'Akan dikirim via WhatsApp', type: 'Transfer Bank' },
        ovo: { name: 'OVO', number: '082283323898', type: 'E-Wallet' },
        gopay: { name: 'GoPay', number: '082283323898', type: 'E-Wallet' },
        dana: { name: 'DANA', number: '082283323898', type: 'E-Wallet' },
        cod: { name: 'COD', number: 'Bayar di tempat', type: 'Cash on Delivery' }
    };
    const details = paymentDetails[payment];
    document.getElementById('paymentInfo').innerHTML = `< div class="font-medium mb-2" > Instruksi Pembayaran:</div > <div class="text-white/80 text-sm mb-4">Metode: ${details.name} (${details.type})<br>Pengiriman: ${delivery === 'takeaway' ? 'Ambil di Tempat' : 'Antar Ojek (Ongkir menyusul via aplikasi)'}<br>Detail: ${details.number}</div><div class="font-medium text-orange-400">Total: Rp ${total.toLocaleString('id-ID')}</div>`;
    cart = []; updateCartUI(); closeCheckout();
    document.getElementById('successModal').classList.remove('hidden');
}
function closeSuccessModal() { document.getElementById('successModal').classList.add('hidden'); }

// ============================================================
// REVIEW / TESTIMONI SYSTEM
// ============================================================
function buildStars(ratingNum) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < ratingNum ? '<span class="text-yellow-400">⭐</span>' : '<span class="text-white/30">⭐</span>';
    return s;
}

function updateFilterButtons() {
    // Teks jumlah count dihapus sesuai permintaan

    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active-filter', 'border-orange-500/50', 'text-orange-400');
        btn.classList.add('border-white/10', 'text-white/70');
    });
    const activeBtn = document.getElementById(`filter-${reviewCurrentFilter}`);
    if (activeBtn) {
        activeBtn.classList.add('active-filter', 'border-orange-500/50', 'text-orange-400');
        activeBtn.classList.remove('border-white/10', 'text-white/70');
    }
}

function renderReviews() {
    const container = document.getElementById('testimonialContainer');
    const emptyEl = document.getElementById('testimonialEmpty');
    const loadBtn = document.getElementById('loadMoreBtn');
    if (!container) return;

    const all = db.getReviews();

    // Filter
    const filtered = reviewCurrentFilter === 'all'
        ? all.filter(r => !r.isHidden)
        : all.filter(r => !r.isHidden && parseInt(r.rating) === reviewCurrentFilter);

    // Ensure visibleCount doesn't exceed filtered length on new filter
    const toShow = filtered.slice(0, reviewVisibleCount);

    // Clear & render
    container.innerHTML = '';

    if (filtered.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (loadBtn) loadBtn.classList.add('hidden');
    } else {
        if (emptyEl) emptyEl.classList.add('hidden');
        toShow.forEach((review, index) => {
            const ratingNum = parseInt(review.rating) || 5;
            const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];
            const initial = review.name.charAt(0).toUpperCase();
            const stars = buildStars(ratingNum);
            const dateStr = review.date
                ? new Date(review.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';
            const div = document.createElement('div');
            div.className = 'testimonial-card glass rounded-2xl p-6 card-hover scroll-animate visible';
            div.dataset.rating = ratingNum;
            div.innerHTML = `
    <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-xl font-bold flex-shrink-0">${initial}</div>
        <div>
            <h4 class="font-semibold">${review.name}</h4>
            <p class="text-white/60 text-xs">${dateStr ? dateStr + ' · ' : ''}Customer</p>
        </div>
    </div>
    <div class="flex gap-1 mb-3">${stars}</div>
    <p class="text-white/80 text-sm leading-relaxed">"${review.comment}"</p>
    `;
            container.appendChild(div);
        });

        // Show / hide load more
        if (loadBtn) {
            if (filtered.length > reviewVisibleCount) {
                loadBtn.classList.remove('hidden');
                loadBtn.textContent = `Baca Selengkapnya (${filtered.length - reviewVisibleCount} lagi) ↓`;
            } else {
                loadBtn.classList.add('hidden');
            }
        }
    }

    updateFilterButtons();
}

function filterReviews(rating) {
    reviewCurrentFilter = rating;
    reviewVisibleCount = REVIEWS_PER_PAGE;
    renderReviews();
}

function loadMoreReviews() {
    reviewVisibleCount += REVIEWS_PER_PAGE;
    renderReviews();
    // Scroll to last new card
    const cards = document.querySelectorAll('#testimonialContainer .testimonial-card');
    if (cards.length >= REVIEWS_PER_PAGE) {
        cards[cards.length - REVIEWS_PER_PAGE]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function submitReview(e) {
    e.preventDefault();
    const name = document.getElementById('reviewName')?.value.trim() || '';
    const rating = document.getElementById('reviewRating')?.value || '5';
    const comment = document.getElementById('reviewComment')?.value.trim() || '';

    if (!name || !comment) { showToast('⚠️', 'Mohon isi nama dan komentar!'); return; }

    const newReview = { id: 'r_' + Date.now(), name, rating: parseInt(rating), comment, date: Date.now() };
    db.addReview(newReview);

    // Reset filter ke 'all' agar bisa langsung terlihat
    reviewCurrentFilter = 'all';
    reviewVisibleCount = db.getReviews().length; // tampil semua agar kartu baru terlihat

    renderReviews();
    showToast('✅', 'Testimoni kamu berhasil ditambahkan! 🎉');
    document.getElementById('reviewForm').reset();

    // Scroll ke kartu baru
    setTimeout(() => {
        const cards = document.querySelectorAll('#testimonialContainer .testimonial-card');
        if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// ============================================================
// ADMIN FUNCTIONS
// ============================================================
function openAdminModal() {
    document.getElementById('adminModal').classList.remove('hidden');
    if (!isAdminLoggedIn) {
        document.getElementById('adminLoginSection').classList.remove('hidden');
        document.getElementById('adminDashboardSection').classList.add('hidden');
    } else {
        document.getElementById('adminLoginSection').classList.add('hidden');
        document.getElementById('adminDashboardSection').classList.remove('hidden');
        renderAddedProducts();
    }
}
function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('adminUsername').value;
    const pass = document.getElementById('adminPassword').value;
    const errorEl = document.getElementById('adminLoginError');
    if (user === 'Abhi' && pass === '010101') {
        isAdminLoggedIn = true; errorEl.classList.add('hidden');
        document.getElementById('adminLoginSection').classList.add('hidden');
        document.getElementById('adminDashboardSection').classList.remove('hidden');
        document.getElementById('adminLoginForm').reset();
        renderAddedProducts(); showToast('✅', 'Login berhasil!');
    } else { errorEl.classList.remove('hidden'); }
}
function handleAdminLogout() {
    isAdminLoggedIn = false;
    document.getElementById('adminLoginSection').classList.remove('hidden');
    document.getElementById('adminDashboardSection').classList.add('hidden');
    cancelEditProduct(); showToast('✅', 'Logout berhasil!');
}
function closeAdminModal() { document.getElementById('adminModal').classList.add('hidden'); }

function submitNewProduct(e) {
    e.preventDefault();
    const name = document.getElementById('addProductName').value;
    const price = document.getElementById('addProductPrice').value;
    const qty = document.getElementById('addProductQty').value;
    const image = document.getElementById('addProductImage').value;
    let products = db.getProducts();

    if (editingProductId) {
        const idx = products.findIndex(p => p.id === editingProductId);
        if (idx > -1) { products[idx] = { ...products[idx], name, price: parseInt(price), qty: parseInt(qty) || 0, image }; showToast('✅', 'Produk berhasil diupdate!'); }
        cancelEditProduct();
    } else {
        products.push({ id: 'prod_' + Date.now(), name, price: parseInt(price), qty: parseInt(qty) || 0, image });
        showToast('✅', 'Produk berhasil ditambahkan!');
        document.getElementById('addProductForm').reset();
    }
    db.saveProducts(products);
    renderAddedProducts();
}
function editAddedProduct(id) {
    const products = db.getProducts();
    const prod = products.find(p => p.id === id); if (!prod) return;
    editingProductId = id;
    document.getElementById('addProductFormTitle').textContent = 'Edit Produk';
    document.getElementById('btnSubmitProduct').textContent = 'Update Produk';
    document.getElementById('btnCancelEdit').classList.remove('hidden');
    document.getElementById('addProductName').value = prod.name;
    document.getElementById('addProductPrice').value = prod.price;
    document.getElementById('addProductQty').value = prod.qty || '';
    document.getElementById('addProductImage').value = prod.image || '';
}
function cancelEditProduct() {
    editingProductId = null;
    document.getElementById('addProductFormTitle').textContent = 'Tambah Produk Baru';
    document.getElementById('btnSubmitProduct').textContent = 'Simpan Produk';
    document.getElementById('btnCancelEdit').classList.add('hidden');
    document.getElementById('addProductForm').reset();
}
function renderAddedProducts() {
    const container = document.getElementById('addedProductsContainer'); if (!container) return;
    const products = db.getProducts();
    if (!products.length) { container.innerHTML = '<p class="text-white/60 text-sm italic">Belum ada produk tambahan.</p>'; return; }
    container.innerHTML = products.map(prod => `
    <div class="glass p-4 rounded-xl flex items-center gap-4">
        ${prod.image ? `<img src="${prod.image}" class="w-16 h-16 rounded-lg object-cover" onerror="this.style.display='none';">` : '<div class="w-16 h-16 flex items-center justify-center bg-white/10 rounded-lg text-2xl">🌭</div>'}
        <div class="flex-1"><h4 class="font-medium break-words">${prod.name}</h4><div class="text-sm text-orange-400">Rp ${prod.price.toLocaleString('id-ID')} ${prod.qty ? `(${prod.qty} pcs)` : ''}</div></div>
        <div class="flex gap-2">
            <button onclick="editAddedProduct('${prod.id}')" class="p-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/40"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
            <button onclick="deleteAddedProduct('${prod.id}')" class="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/40"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
    </div>`).join('');
}
function deleteAddedProduct(id) {
    const products = db.getProducts().filter(p => p.id !== id);
    db.saveProducts(products); renderAddedProducts();
}

function switchAdminTab(tab) {
    const tabs = ['products', 'chatbot', 'video', 'testimoni'];
    tabs.forEach(t => {
        const content = document.getElementById(`adminTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
        if (!content || !btn) return;

        if (t === tab) {
            content.classList.remove('hidden');
            btn.className = 'px-4 py-2 text-orange-400 border-b-2 border-orange-400 font-medium';
        } else {
            content.classList.add('hidden');
            btn.className = 'px-4 py-2 text-white/60 hover:text-white transition-colors';
        }
    });

    if (tab === 'products') renderAddedProducts();
    if (tab === 'chatbot') renderBotReplies();
    if (tab === 'video') {
        const urlInput = document.getElementById('adminVideoUrl');
        if (urlInput) urlInput.value = db.getVideo() || '';
    }
    if (tab === 'testimoni') renderAdminTestimoni();
}

function renderAdminTestimoni() {
    const container = document.getElementById('adminTestimoniContainer');
    if (!container) return;
    const all = db.getReviews();
    if (!all.length) { container.innerHTML = '<p class="text-white/60 text-sm italic">Belum ada testimoni.</p>'; return; }

    container.innerHTML = all.map(r => `
    <div class="glass p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${r.isHidden ? 'opacity-50' : ''}">
        <div class="flex-1">
            <h4 class="font-medium">${r.name} <span class="text-yellow-400 text-sm ml-2">${'⭐'.repeat(r.rating)}</span></h4>
            <p class="text-white/80 text-sm mt-1">"${r.comment}"</p>
            <div class="text-xs text-white/50 mt-1">${new Date(r.date || Date.now()).toLocaleDateString('id-ID')}</div>
        </div>
        <div class="flex gap-2">
            <button onclick="toggleTestimoniVisibility('${r.id}')" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${r.isHidden ? 'bg-green-500/20 text-green-400 hover:bg-green-500/40' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/40'}">
                ${r.isHidden ? 'Tampilkan' : 'Sembunyikan'}
            </button>
        </div>
    </div>`).join('');
}

function toggleTestimoniVisibility(id) {
    const reviews = db.getReviews();
    const idx = reviews.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
        reviews[idx].isHidden = !reviews[idx].isHidden;
        db.save(DB_KEYS.reviews, reviews);

        renderAdminTestimoni();

        // Refresh frontend list
        reviewVisibleCount = REVIEWS_PER_PAGE;
        renderReviews();

        showToast('✅', `Testimoni berhasil ${reviews[idx].isHidden ? 'disembunyikan' : 'ditampilkan'}!`);
    }
}

// Admin — Pesanan
function renderAdminOrders() {
    const container = document.getElementById('adminOrdersContainer'); if (!container) return;
    const allOrders = window.dataSdk ? orders : db.getOrders();
    if (!allOrders.length) { container.innerHTML = '<p class="text-white/60 text-sm italic">Belum ada pesanan masuk.</p>'; return; }
    container.innerHTML = allOrders.slice().reverse().map(o => `
    <div class="glass p-4 rounded-xl">
        <div class="flex justify-between items-start mb-2">
            <div><h4 class="font-medium">${o.customer_name}</h4><p class="text-white/60 text-sm">${o.customer_phone}</p></div>
            <span class="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full">${o.status}</span>
        </div>
        <p class="text-sm text-white/80 mb-1">${o.product_name}</p>
        <p class="text-sm text-white/60">${o.delivery_method} · ${o.payment_method}</p>
        <div class="text-orange-400 font-semibold mt-2">Rp ${o.price.toLocaleString('id-ID')}</div>
    </div>`).join('');
}

// ============================================================
// PROMO VIDEO ADMIN & RENDERING
// ============================================================
function renderPromoVideo() {
    const container = document.getElementById('promoVideoContainer');
    const linkEl = document.getElementById('promoVideoLink');
    if (!container || !linkEl) return;

    const savedUrl = db.getVideo();

    if (savedUrl && typeof savedUrl === 'string' && savedUrl.includes('youtu')) {
        linkEl.href = savedUrl;
        container.classList.remove('hidden');
    } else {
        // Default placeholder so the section is always visible to the user
        linkEl.href = 'https://www.youtube.com';
        container.classList.remove('hidden');
    }
}

function submitPromoVideo(e) {
    e.preventDefault();
    const url = document.getElementById('adminVideoUrl').value.trim();
    if (!url) {
        showToast('⚠️', 'URL Video tidak boleh kosong!');
        return;
    }

    // Simple verification
    if (!url.includes('youtu')) {
        showToast('❌', 'Harus berupa link valid dari YouTube!');
        return;
    }

    db.saveVideo(url);
    showToast('✅', 'Link Video Promo berhasil disimpan!');
    renderPromoVideo();
}

function deletePromoVideo() {
    db.saveVideo(null);
    document.getElementById('adminVideoUrl').value = '';
    showToast('✅', 'Video Promo berhasil dihapus!');
    renderPromoVideo();
}

// ============================================================
// BOT REPLIES (Chatbot Admin)
// ============================================================
function submitBotReply(e) {
    e.preventDefault();
    const keyword = document.getElementById('botKeyword').value.trim();
    const response = document.getElementById('botResponse').value.trim();
    let replies = db.getBotReplies();
    if (editingKeyword !== null) {
        const idx = replies.findIndex(r => r.keyword === editingKeyword);
        if (idx !== -1) { replies[idx] = { keyword, response }; showToast('✅', 'Respon terupdate!'); }
        cancelEditReply();
    } else {
        const idx = replies.findIndex(r => r.keyword.toLowerCase() === keyword.toLowerCase());
        if (idx !== -1) { replies[idx].response = response; showToast('✅', 'Respon dioverwrite!'); }
        else { replies.push({ keyword, response }); showToast('✅', 'Respon custom ditambahkan!'); }
    }
    db.saveBotReplies(replies);
    document.getElementById('addBotReplyForm').reset();
    renderBotReplies();
}
function editBotReply(keyword) {
    const replies = db.getBotReplies();
    const repl = replies.find(r => r.keyword === keyword); if (!repl) return;
    editingKeyword = keyword;
    document.getElementById('botReplyFormTitle').textContent = 'Edit Respon Custom';
    document.getElementById('btnSubmitReply').textContent = 'Update Respon';
    document.getElementById('btnCancelReply').classList.remove('hidden');
    document.getElementById('botKeyword').value = repl.keyword;
    document.getElementById('botResponse').value = repl.response;
}
function cancelEditReply() {
    editingKeyword = null;
    document.getElementById('botReplyFormTitle').textContent = 'Tambah Respon Custom Bot';
    document.getElementById('btnSubmitReply').textContent = 'Simpan Respon';
    document.getElementById('btnCancelReply').classList.add('hidden');
    document.getElementById('addBotReplyForm').reset();
}
function deleteBotReply(keyword) {
    db.saveBotReplies(db.getBotReplies().filter(r => r.keyword !== keyword));
    renderBotReplies();
}
function renderBotReplies() {
    const container = document.getElementById('botRepliesContainer'); if (!container) return;
    const replies = db.getBotReplies();
    if (!replies.length) { container.innerHTML = '<p class="text-white/60 text-sm italic">Belum ada respon custom.</p>'; return; }
    container.innerHTML = replies.map(r => `
    <div class="glass p-4 rounded-xl flex items-center gap-4">
        <div class="flex-1"><span class="inline-block px-2 py-1 bg-white/10 rounded-lg text-xs font-bold text-orange-400 mb-2">Kata Kunci: "${r.keyword}"</span><p class="text-white/80 text-sm">${r.response}</p></div>
        <div class="flex gap-2">
            <button onclick="editBotReply('${r.keyword}')" class="p-2 bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/40"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
            <button onclick="deleteBotReply('${r.keyword}')" class="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/40"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
    </div>`).join('');
}

// ============================================================
// CHATBOT (Frontend) — menggunakan db.getBotReplies()
// ============================================================
function getBotResponse(message) {
    const msg = message.toLowerCase().trim();
    const replies = db.getBotReplies();
    for (const r of replies) {
        if (msg.includes(r.keyword.toLowerCase())) return r.response;
    }
    // Fallback built-in
    if (msg.includes('corndog')) return 'Corndog mini kita terbuat dari sosis premium dibalut tepung crispy dan keju meleleh! 🧀🌭';
    if (msg.includes('pesan') || msg.includes('order')) return 'Untuk pesan, klik tombol "Pesan Sekarang" atau hubungi kami via WhatsApp ya kak! 🛒';
    if (msg.includes('bayar') || msg.includes('pembayaran')) return 'Kami menerima SeaBank, OVO, GoPay, DANA, dan COD (bayar di tempat) kak! 💳';
    if (msg.includes('ongkir') || msg.includes('kirim')) return 'Bisa ambil sendiri (gratis) atau via GoFood/ShopeeFood (ongkir sesuai aplikasi) kak! 🚚';
    return 'Maaf kak, saya belum paham pertanyaannya 😅 Coba tanyakan tentang menu, harga, jam buka, atau cara pesan ya!';
}

// ============================================================
// TOAST
// ============================================================
function showToast(icon, message) {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast) return;
    toastIcon.textContent = icon; toastMsg.textContent = message;
    toast.classList.remove('hidden');
    toast.style.animation = 'none'; toast.offsetHeight; toast.style.animation = null;
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ============================================================
// CHATBOT UI
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // Chatbot toggle
    const toggleBtn = document.getElementById('chatbotToggleBtn');
    const closeBtn = document.getElementById('chatbotCloseBtn');
    const chatBox = document.getElementById('chatbotBox');
    const form = document.getElementById('chatbotForm');
    const input = document.getElementById('chatbotInput');
    const messagesEl = document.getElementById('chatbotMessages');
    const suggestions = document.querySelectorAll('.chat-suggestion');

    if (toggleBtn && chatBox) {
        toggleBtn.addEventListener('click', () => { 
            chatBox.classList.toggle('hidden'); 
            chatBox.classList.toggle('flex'); 
            if (!chatBox.classList.contains('hidden') && input) input.focus();
        });
    }
    if (closeBtn && chatBox) {
        closeBtn.addEventListener('click', () => { chatBox.classList.add('hidden'); chatBox.classList.remove('flex'); });
    }

    function addMessage(text, isUser = false) {
        const div = document.createElement('div');
        div.className = isUser ? 'flex gap-3 justify-end' : 'flex gap-3';
        if (isUser) {
            div.innerHTML = `<div class="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-3 rounded-2xl rounded-tr-none text-sm max-w-[80%]">${text}</div>`;
        } else {
            div.innerHTML = `<div class="w-8 h-8 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1">🌭</div><div class="bg-white/10 text-white p-3 rounded-2xl rounded-tl-none text-sm max-w-[80%] border border-white/5">${text}</div>`;
        }
        if (messagesEl) { messagesEl.appendChild(div); messagesEl.scrollTop = messagesEl.scrollHeight; }
    }

    function handleUserInput(text) {
        if (!text.trim()) return;
        addMessage(text, true);
        // Hide suggestions
        const sugg = document.getElementById('chatbotSuggestions');
        if (sugg) sugg.classList.add('hidden');
        setTimeout(() => addMessage(getBotResponse(text)), 600);
    }

    if (form) {
        form.addEventListener('submit', (e) => { e.preventDefault(); const val = input.value.trim(); input.value = ''; handleUserInput(val); });
    }
    suggestions.forEach(btn => {
        btn.addEventListener('click', () => handleUserInput(btn.textContent.trim()));
    });
});

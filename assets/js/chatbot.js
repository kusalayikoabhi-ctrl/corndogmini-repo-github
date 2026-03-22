// Chatbot Logic
const chatbotToggleBtn = document.getElementById('chatbotToggleBtn');
const chatbotCloseBtn = document.getElementById('chatbotCloseBtn');
const chatbotBox = document.getElementById('chatbotBox');
const chatbotForm = document.getElementById('chatbotForm');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotMessages = document.getElementById('chatbotMessages');
const chatbotSuggestions = document.querySelectorAll('.chat-suggestion');

// Toggle Chatbot Window
function toggleChatbot() {
    chatbotBox.classList.toggle('hidden');
    if (!chatbotBox.classList.contains('hidden')) {
        chatbotInput.focus();
    }
}

chatbotToggleBtn.addEventListener('click', toggleChatbot);
chatbotCloseBtn.addEventListener('click', toggleChatbot);

// Auto-scroll to bottom of chat
function scrollToBottom() {
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// Add message to UI
function addMessage(text, isUser = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex gap-3 chatbot-msg-enter ${isUser ? 'flex-row-reverse' : ''}`;

    // Icon
    const iconDiv = document.createElement('div');
    iconDiv.className = `w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm flex-shrink-0 mt-1 ${isUser ? 'bg-white/10' : 'bg-gradient-to-br from-orange-400 to-yellow-400'
        }`;
    iconDiv.textContent = isUser ? '👤' : '🌭';

    // Bubble
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `p-3 rounded-2xl text-sm max-w-[80%] border border-white/5 shadow-sm ${isUser
        ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-tr-none'
        : 'bg-white/10 text-white rounded-tl-none'
        }`;
    bubbleDiv.innerHTML = text; // allow bold / formatting

    msgDiv.appendChild(iconDiv);
    msgDiv.appendChild(bubbleDiv);

    chatbotMessages.appendChild(msgDiv);
    scrollToBottom();
}

// Basic Bot Brain (Keyword checking)
function botReply(userMsg) {
    const msg = userMsg.toLowerCase();

    setTimeout(() => {
        let reply = "Maaf kak, MiniBot kurang mengerti. Bisa hubungi admin langsung via tombol WhatsApp ya! 😊";

        const customReplies = JSON.parse(localStorage.getItem('customBotReplies')) || [
            { keyword: 'buka', response: "Dogmini buka setiap hari dari jam <strong>10.00 pagi</strong> sampai <strong>17.00 sore</strong> kak! ⏰" },
            { keyword: 'jam', response: "Dogmini buka setiap hari dari jam <strong>10.00 pagi</strong> sampai <strong>17.00 sore</strong> kak! ⏰" },
            { keyword: 'pesan', response: "Cara pesan gampang banget! Kakak tinggal klik tombol <strong>+Keranjang</strong> di menu, lalu klik Checkout dan isi data diri pengiriman. 📦" },
            { keyword: 'order', response: "Cara pesan gampang banget! Kakak tinggal klik tombol <strong>+Keranjang</strong> di menu, lalu klik Checkout dan isi data diri pengiriman. 📦" },
            { keyword: 'ongkir', response: "Untuk pengiriman saat ini promo <strong>GRATIS ONGKIR</strong> untuk area Pekanbaru kak! Kurir kami siap antar sampai rumah. 🛵💨" },
            { keyword: 'pengiriman', response: "Untuk pengiriman saat ini promo <strong>GRATIS ONGKIR</strong> untuk area Pekanbaru kak! Kurir kami siap antar sampai rumah. 🛵💨" },
            { keyword: 'menu', response: "Menu paling Best Seller kita itu <strong>Paket Santai</strong> kak! Dapat 10 pcs + Free Topping Keju. Cobain deh dijamin ketagihan! 🧀🔥" },
            { keyword: 'favorit', response: "Menu paling Best Seller kita itu <strong>Paket Santai</strong> kak! Dapat 10 pcs + Free Topping Keju. Cobain deh dijamin ketagihan! 🧀🔥" },
            { keyword: 'enak', response: "Menu paling Best Seller kita itu <strong>Paket Santai</strong> kak! Dapat 10 pcs + Free Topping Keju. Cobain deh dijamin ketagihan! 🧀🔥" },
            { keyword: 'halo', response: "Halo juga kak! Ada yang mau ditanyakan seputar Dogmini?" },
            { keyword: 'hi', response: "Halo juga kak! Ada yang mau ditanyakan seputar Dogmini?" },
            { keyword: 'hai', response: "Halo juga kak! Ada yang mau ditanyakan seputar Dogmini?" },
            { keyword: 'bayar', response: "Pembayaran bisa menggunakan Transfer Bank (SeaBank), E-Wallet (OVO, GoPay, DANA), atau bisa <strong>COD (Bayar di tempat)</strong> lho kak! 💳💵" },
            { keyword: 'pembayaran', response: "Pembayaran bisa menggunakan Transfer Bank (SeaBank), E-Wallet (OVO, GoPay, DANA), atau bisa <strong>COD (Bayar di tempat)</strong> lho kak! 💳💵" },
            { keyword: 'cod', response: "Pembayaran bisa menggunakan Transfer Bank (SeaBank), E-Wallet (OVO, GoPay, DANA), atau bisa <strong>COD (Bayar di tempat)</strong> lho kak! 💳💵" }
        ];

        for (const item of customReplies) {
            if (msg.includes(item.keyword.toLowerCase())) {
                reply = item.response;
                break;
            }
        }

        addMessage(reply, false);
    }, 600); // simulate typing delay
}

// Handle submit
chatbotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatbotInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    chatbotInput.value = '';

    botReply(text);
});

// Handle suggestions click
chatbotSuggestions.forEach(btn => {
    btn.addEventListener('click', () => {
        chatbotInput.value = btn.textContent;
        chatbotForm.dispatchEvent(new Event('submit'));
    });
});

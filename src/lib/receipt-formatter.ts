import { Receipt as ReceiptType } from '@/types/pos';

export const formatThermalReceipt = (receipt: ReceiptType, formatPrice: (price: number) => string): string => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // ESC/POS Commands
  const ESC = '\x1B';
  const BOLD_ON = ESC + 'E\x01';
  const BOLD_OFF = ESC + 'E\x00';
  const CENTER = ESC + 'a\x01';
  const LEFT = ESC + 'a\x00';
  const CUT = '\x1D' + 'V\x42\x00';
  
  // Format harga tanpa simbol currency karena kita tulis manual
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  return `${ESC}@${CENTER}${BOLD_ON}================================${BOLD_OFF}
${BOLD_ON}TOKO ANJAR FOTOCOPY & ATK${BOLD_OFF}
${BOLD_ON}================================${BOLD_OFF}
Jl. Raya Gajah - Dempet
(Depan Koramil Gajah)
Telp/WA: 0895630183347

${BOLD_ON}================================${BOLD_OFF}
${BOLD_ON}STRUK PENJUALAN${BOLD_OFF}
${BOLD_ON}================================${BOLD_OFF}
Invoice: ${BOLD_ON}${receipt.id}${BOLD_OFF}
Tanggal: ${formatDate(receipt.timestamp)}
${BOLD_ON}--------------------------------${BOLD_OFF}
${LEFT}
${receipt.items.map(item => {
  const price = item.finalPrice || item.product.sellPrice;
  const total = price * item.quantity;
  const itemName = item.product.name;
  const qtyPrice = `${item.quantity} x Rp ${formatAmount(price)}`;
  const totalPrice = `Rp ${formatAmount(total)}`;
  
  // Untuk kertas kecil (32 karakter)
  return `${itemName}
${qtyPrice}
${' '.repeat(Math.max(0, 32 - totalPrice.length))}${BOLD_ON}${totalPrice}${BOLD_OFF}`;
}).join('\n\n')}

${BOLD_ON}--------------------------------${BOLD_OFF}
Subtotal: ${' '.repeat(Math.max(0, 15 - `Rp ${formatAmount(receipt.subtotal)}`.length))}${BOLD_ON}Rp ${formatAmount(receipt.subtotal)}${BOLD_OFF}${receipt.discount > 0 ? `
Diskon: ${' '.repeat(Math.max(0, 17 - `Rp ${formatAmount(receipt.discount)}`.length))}${BOLD_ON}Rp ${formatAmount(receipt.discount)}${BOLD_OFF}` : ''}
${BOLD_ON}--------------------------------${BOLD_OFF}
${BOLD_ON}TOTAL: ${' '.repeat(Math.max(0, 18 - `Rp ${formatAmount(receipt.total)}`.length))}Rp ${formatAmount(receipt.total)}${BOLD_OFF}

Metode: ${BOLD_ON}${receipt.paymentMethod?.toUpperCase() || 'CASH'}${BOLD_OFF}

${CENTER}${BOLD_ON}================================${BOLD_OFF}
${BOLD_ON}TERIMA KASIH ATAS${BOLD_OFF}
${BOLD_ON}KUNJUNGAN ANDA!${BOLD_OFF}
    
${BOLD_ON}Semoga Hari Anda Menyenangkan${BOLD_OFF}
${BOLD_ON}================================${BOLD_OFF}

${CUT}`;
};

export const formatPrintReceipt = (receipt: ReceiptType, formatPrice: (price: number) => string): string => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format harga tanpa simbol currency karena kita tulis manual
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  return `
      <div style="font-family: monospace; max-width: 300px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2>TOKO ANJAR FOTOCOPY & ATK</h2>
          <p>Jl. Raya Gajah - dempet (Depan Koramil Gajah)</p>
          <p>Telp/WA: 0895630183347</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 20px;">
          <h3>STRUK PENJUALAN</h3>
          <p>${receipt.id}</p>
          <p>${formatDate(receipt.timestamp)}</p>
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 20px 0; padding-top: 10px;">
          ${receipt.items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div>
                <div style="font-weight: bold;">${item.product.name}</div>
                <div style="font-size: 12px;">Rp ${formatAmount(item.finalPrice || item.product.sellPrice)} × ${item.quantity}</div>
              </div>
              <div style="font-weight: bold;">
                Rp ${formatAmount((item.finalPrice || item.product.sellPrice) * item.quantity)}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 20px 0; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Subtotal:</span>
            <span>Rp ${formatAmount(receipt.subtotal)}</span>
          </div>
          ${receipt.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #dc2626;">
              <span>Diskon:</span>
              <span>-Rp ${formatAmount(receipt.discount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; border-top: 1px solid #000; padding-top: 10px;">
            <span>TOTAL:</span>
            <span>Rp ${formatAmount(receipt.total)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px;">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p>Semoga Hari Anda Menyenangkan</p>
          <p style="margin-top: 10px;">Kasir: Admin | ${receipt.paymentMethod?.toUpperCase() || 'CASH'}</p>
        </div>
      </div>
    `;
};
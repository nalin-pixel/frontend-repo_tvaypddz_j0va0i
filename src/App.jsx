import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'

const BRAND = {
  name: 'VELLIXAO',
  phone: '085706400133',
  logo: 'https://files.catbox.moe/a9u0pd.png',
}

function currency(n) {
  try {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
  } catch {
    return `Rp ${Math.round(n || 0).toLocaleString('id-ID')}`
  }
}

function App() {
  const [customerName, setCustomerName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const [itemPrice, setItemPrice] = useState('')
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Only capture this node so buttons are excluded
  const receiptRef = useRef(null)

  const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  useEffect(() => {
    setError('')
  }, [customerName, itemName, itemQty, itemPrice, items, notes])

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.quantity * it.price, 0), [items])

  const addItem = () => {
    if (!itemName.trim()) return setError('Nama item wajib diisi')
    const qty = Math.max(1, Number(itemQty) || 1)
    const price = Number(itemPrice)
    if (isNaN(price)) return setError('Harga harus angka')
    setItems(prev => [...prev, { name: itemName.trim(), quantity: qty, price }])
    setItemName('')
    setItemQty(1)
    setItemPrice('')
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const resetAll = () => {
    setCustomerName('')
    setItems([])
    setNotes('')
    setReceipt(null)
    setError('')
  }

  const createReceipt = async () => {
    if (items.length === 0) return setError('Tambahkan minimal satu item')
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${backend}/api/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: customerName || null, items, notes: notes || null }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setReceipt(data)
      // Keep a copy of created items on the preview
      setItems(data.items || [])
    } catch (e) {
      setError(`Gagal membuat struk: ${e.message?.slice(0, 120)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPNG = async () => {
    if (!receipt) return setError('Buat struk terlebih dahulu')
    const node = receiptRef.current
    if (!node) return
    try {
      setDownloading(true)
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: 3, // tajam untuk kirim via chat
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        logging: false,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      const number = `#${String(receipt.number).padStart(4, '0')}`
      a.download = `${BRAND.name}_Struk_${number}.png`
      a.href = dataUrl
      a.click()
    } catch (e) {
      setError('Gagal mengunduh struk. Pastikan logo bisa dimuat dan coba lagi.')
    } finally {
      setDownloading(false)
    }
  }

  // Render helpers
  const renderItems = (list) => {
    if (!list || list.length === 0) return (
      <div className="text-center text-xs text-slate-500 py-3">Belum ada item</div>
    )
    return list.map((it, idx) => (
      <div key={idx} className="flex text-[13px] leading-5">
        <div className="flex-1 pr-2 break-words">{it.name}</div>
        <div className="w-14 text-right">{it.quantity}x</div>
        <div className="w-28 text-right">{currency(it.price)}</div>
      </div>
    ))
  }

  const liveSubtotal = useMemo(() => {
    const base = receipt?.items ? receipt.items : items
    return base.reduce((s, it) => s + it.quantity * it.price, 0)
  }, [receipt, items])

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={BRAND.logo} alt="logo" crossOrigin="anonymous" className="h-8 w-8 rounded" />
          <div className="leading-tight">
            <p className="font-semibold text-sm">{BRAND.name}</p>
            <p className="text-xs text-slate-500">Nomor: {BRAND.phone}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={downloadPNG} disabled={!receipt || downloading} className="px-3 py-2 rounded bg-black text-white text-sm disabled:opacity-50">
              {downloading ? 'Menyiapkan…' : 'Unduh PNG'}
            </button>
            <button onClick={resetAll} className="px-3 py-2 rounded border text-sm">Reset</button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-2 gap-6">
        {/* Builder */}
        <section className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Buat Struk</h2>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-sm text-slate-600">Atas Nama (opsional)</label>
              <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Nama pelanggan" className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-600">Catatan (opsional)</label>
              <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contoh: Harap simpan invoice" className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-6">
              <label className="text-sm text-slate-600">Nama Item</label>
              <input value={itemName} onChange={e=>setItemName(e.target.value)} placeholder="Contoh: Produk A" className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-slate-600">Qty</label>
              <input type="number" min="1" value={itemQty} onChange={e=>setItemQty(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div className="col-span-4">
              <label className="text-sm text-slate-600">Harga (IDR)</label>
              <input type="number" value={itemPrice} onChange={e=>setItemPrice(e.target.value)} placeholder="0" className="mt-1 w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div className="col-span-12">
              <button onClick={addItem} className="w-full bg-black text-white rounded py-2 text-sm">Tambah Item</button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="mt-3 border rounded-lg p-3 bg-slate-50">
              <div className="text-xs text-slate-600 mb-2">Daftar Item</div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-start text-sm">
                    <div className="flex-1 pr-2">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-slate-500">{it.quantity} x {currency(it.price)}</div>
                    </div>
                    <div className="text-right font-medium">{currency(it.quantity * it.price)}</div>
                    <button onClick={()=>removeItem(idx)} className="ml-3 text-xs text-red-600">Hapus</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <div className="text-sm">Subtotal</div>
                <div className="font-semibold">{currency(subtotal)}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}

          <div className="mt-4 flex gap-3">
            <button onClick={createReceipt} disabled={submitting} className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50">
              {submitting ? 'Membuat…' : 'Buat Struk'}
            </button>
            <a href="/test" className="px-4 py-2 rounded border text-sm">Tes Koneksi</a>
          </div>
        </section>

        {/* Receipt Preview (Thermal style 58/80mm) */}
        <section className="flex items-start justify-center">
          <div className="bg-white border rounded-xl p-4 w-full max-w-[380px]">
            <div className="text-xs text-slate-500 mb-2">Pratinjau Struk</div>

            {/* CAPTURED AREA ONLY */}
            <div ref={receiptRef} className="mx-auto bg-white text-black p-4 rounded shadow-sm" style={{ width: 336 }}>
              {/* Thermal look: mono, tight spacing */}
              <div className="font-mono text-[13px] leading-5">
                {/* Header */}
                <div className="text-center">
                  <img src={BRAND.logo} alt="logo" crossOrigin="anonymous" className="mx-auto mb-2 h-12 w-12" />
                  <div className="font-bold text-[14px] tracking-wide">{BRAND.name}</div>
                  <div className="text-[12px]">{BRAND.phone}</div>
                </div>

                <div className="my-2 border-t border-dashed" />

                {/* Meta */}
                <div className="flex justify-between text-[12px]">
                  <div>Tanggal</div>
                  <div>{new Date().toLocaleString('id-ID')}</div>
                </div>
                <div className="flex justify-between text-[12px]">
                  <div>No. Struk</div>
                  <div>{receipt ? String(receipt.number).padStart(4,'0') : 'DRAFT'}</div>
                </div>
                <div className="flex justify-between text-[12px]">
                  <div>Pelanggan</div>
                  <div className="text-right max-w-[55%] truncate">{receipt?.customer_name || customerName || '-'}</div>
                </div>

                <div className="my-2 border-t border-dashed" />

                {/* Items */}
                {renderItems(receipt?.items || items)}

                <div className="my-2 border-t border-dashed" />

                {/* Totals */}
                <div className="flex justify-between font-bold">
                  <div>Total</div>
                  <div>{currency(receipt?.total ?? liveSubtotal)}</div>
                </div>

                {/* Notes */}
                <div className="mt-2 text-[12px]">Catatan: {receipt?.notes || notes || '-'}</div>

                <div className="my-2 border-t border-dashed" />

                {/* Footer */}
                <div className="text-center text-[12px]">
                  <div>Terima kasih!</div>
                  <div>Barang sudah diterima dengan baik.</div>
                </div>
              </div>
            </div>
            {/* END CAPTURED AREA */}

            {/* Controls kept OUTSIDE capture */}
            <div className="mt-3 text-xs text-slate-500">Tampilan unduhan hanya area putih di atas.</div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App

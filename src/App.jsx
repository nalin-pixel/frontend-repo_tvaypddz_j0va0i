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

  const previewRef = useRef(null)

  const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  useEffect(() => {
    setError('')
  }, [customerName, itemName, itemQty, itemPrice, items])

  const subtotal = useMemo(() => {
    return items.reduce((s, it) => s + it.quantity * it.price, 0)
  }, [items])

  const addItem = () => {
    if (!itemName.trim()) return setError('Nama item wajib diisi')
    const qty = Number(itemQty) || 1
    const price = Number(itemPrice)
    if (isNaN(price)) return setError('Harga harus angka')
    setItems(prev => [...prev, { name: itemName.trim(), quantity: qty, price }])
    setItemName('')
    setItemQty(1)
    setItemPrice('')
  }

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

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
        body: JSON.stringify({
          customer_name: customerName || null,
          items,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setReceipt(data)
      // Prepare for next receipt quickly
      setItems([])
      setCustomerName('')
      setNotes('')
    } catch (e) {
      setError(`Gagal membuat struk: ${e.message?.slice(0, 120)}`)
    } finally {
      setSubmitting(false)
    }
  }

  const downloadReceipt = async () => {
    if (!receipt) return
    try {
      setDownloading(true)
      const node = previewRef.current
      if (!node) return
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: window.devicePixelRatio < 2 ? 2 : window.devicePixelRatio,
        useCORS: true,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const number = `#${receipt.number.toString().padStart(4, '0')}`
      link.download = `${BRAND.name}_Receipt_${number}.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      setError('Gagal mengunduh struk. Coba lagi.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-900 text-white">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={BRAND.logo} alt="logo" className="h-10 w-10 rounded-lg shadow-md ring-2 ring-white/20" />
          <div>
            <h1 className="text-xl font-semibold tracking-wide">{BRAND.name}</h1>
            <p className="text-xs text-white/70">Nomor: {BRAND.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60">Generator Struk Otomatis</p>
          <p className="text-xs text-white/60">Nomor struk berurutan</p>
        </div>
      </header>

      <main className="px-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Builder Panel */}
          <section className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Data Struk</h2>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/80 mb-1">Atas Nama (opsional)</label>
                  <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Nama pelanggan" className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-1">Catatan (opsional)</label>
                  <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Tuliskan catatan singkat" className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-6">
                  <label className="block text-sm text-white/80 mb-1">Nama Item</label>
                  <input value={itemName} onChange={e=>setItemName(e.target.value)} placeholder="Contoh: Layanan A" className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-white/80 mb-1">Qty</label>
                  <input type="number" min="1" value={itemQty} onChange={e=>setItemQty(e.target.value)} className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                </div>
                <div className="col-span-4">
                  <label className="block text-sm text-white/80 mb-1">Harga (IDR)</label>
                  <input type="number" value={itemPrice} onChange={e=>setItemPrice(e.target.value)} placeholder="0" className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                </div>
                <div className="col-span-12">
                  <button onClick={addItem} className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 active:bg-fuchsia-700 text-white font-medium py-2 rounded-lg transition-colors">Tambah Item</button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="mt-2 border border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Item</th>
                        <th className="text-right px-3 py-2 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 font-medium">Harga</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} className="odd:bg-white/0 even:bg-white/5">
                          <td className="px-3 py-2">{it.name}</td>
                          <td className="px-3 py-2 text-right">{it.quantity}</td>
                          <td className="px-3 py-2 text-right">{currency(it.price)}</td>
                          <td className="px-3 py-2 text-right">{currency(it.quantity * it.price)}</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={()=>removeItem(idx)} className="text-red-300 hover:text-red-200">Hapus</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="px-3 py-3 font-semibold" colSpan={3}>Subtotal</td>
                        <td className="px-3 py-3 font-semibold text-right">{currency(subtotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-200 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2">{error}</div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={createReceipt} disabled={submitting} className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition-colors">
                  {submitting ? 'Membuat...' : 'Buat Struk'}
                </button>
                <button onClick={resetAll} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20">Reset</button>
              </div>
            </div>
          </section>

          {/* Preview Panel */}
          <section className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-b from-white to-slate-50 text-slate-900">
            {/* Elegant watermark */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{backgroundImage:`url(${BRAND.logo})`, backgroundRepeat:'no-repeat', backgroundPosition:'center 40%', backgroundSize:'50%'}}></div>

            {/* Receipt content to capture */}
            <div ref={previewRef} className="relative">
              {/* Header */}
              <div className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white p-6">
                <div className="flex items-center gap-4">
                  <img src={BRAND.logo} alt="logo" className="h-12 w-12 rounded-lg bg-white/20 p-1" />
                  <div>
                    <h3 className="text-xl font-semibold tracking-wide">{BRAND.name}</h3>
                    <p className="text-xs text-white/90">Nomor: {BRAND.phone}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-300"></span>
                      {receipt ? `No. ${receipt.number.toString().padStart(4,'0')}` : 'Draft'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
                  <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-4">
                    <p className="text-slate-500">Tanggal</p>
                    <p className="font-semibold mt-1">{new Date().toLocaleString('id-ID')}</p>
                  </div>
                  <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-4">
                    <p className="text-slate-500">Pelanggan</p>
                    <p className="font-semibold mt-1">{receipt?.customer_name || customerName || '-'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-3 py-2">Item</th>
                        <th className="text-right px-3 py-2">Qty</th>
                        <th className="text-right px-3 py-2">Harga</th>
                        <th className="text-right px-3 py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(receipt?.items || items).map((it, idx) => (
                        <tr key={idx} className="odd:bg-white even:bg-slate-50">
                          <td className="px-3 py-2">{it.name}</td>
                          <td className="px-3 py-2 text-right">{it.quantity}</td>
                          <td className="px-3 py-2 text-right">{currency(it.price)}</td>
                          <td className="px-3 py-2 text-right">{currency(it.quantity * it.price)}</td>
                        </tr>
                      ))}
                      {(receipt?.items || items).length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-400" colSpan={4}>Belum ada item</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t">
                        <td className="px-3 py-2 font-semibold" colSpan={3}>Subtotal</td>
                        <td className="px-3 py-2 text-right font-semibold">{currency(receipt?.subtotal ?? items.reduce((s, it) => s + it.quantity * it.price, 0))}</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-3 text-slate-500 text-xs" colSpan={4}>Catatan: {receipt?.notes || notes || '-'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Terima kasih telah bertransaksi di {BRAND.name}</p>
                  <div className="flex gap-3">
                    <button onClick={downloadReceipt} disabled={!receipt || downloading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50">
                      {downloading ? 'Menyiapkan...' : 'Unduh'}
                    </button>
                    <a href="/test" className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800">Tes Koneksi</a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App

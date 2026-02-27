import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import BarcodeScanner from '@/components/BarcodeScanner';
import SignaturePadSection from '@/components/SignaturePadSection';
import InvoicePreview from '@/components/InvoicePreview';
import productsSeed from '@/data/products.json';
import { invoiceTemplates, signatureFonts } from '@/data/templates';

const newItem = () => ({ id: crypto.randomUUID(), barcode: '', name: '', qty: 1, price: 0, tax: 0, discount: 0 });

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [products, setProducts] = useState(productsSeed);
  const [templateId, setTemplateId] = useState(invoiceTemplates[0].id);
  const [signatureData, setSignatureData] = useState('');
  const [signatureImage, setSignatureImage] = useState('');
  const [signatureStyle, setSignatureStyle] = useState(signatureFonts[0]);
  const [invoice, setInvoice] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    currency: 'USD',
    paymentStatus: 'Pending',
    size: 'A4',
    client: { name: '', address: '', phone: '', gst: '', email: '' },
    taxMode: 'GST',
    discountType: 'percentage',
    discountValue: 0,
    shipping: 0,
    notes: 'Thank you for your business.',
    terms: 'Payment due within 7 days.',
    items: [newItem()]
  });
  const [customSize, setCustomSize] = useState({ width: '820px', minHeight: '1100px' });
  const [signatureMeta, setSignatureMeta] = useState({ x: 510, y: 40, width: 140 });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const saved = localStorage.getItem('invoice-builder-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      setInvoice(parsed.invoice);
      setTemplateId(parsed.templateId || invoiceTemplates[0].id);
      setProducts(parsed.products || productsSeed);
    }
  }, []);

  const totals = useMemo(() => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const tax = invoice.items.reduce((sum, item) => sum + item.qty * item.price * (item.tax / 100), 0);
    const discount = invoice.discountType === 'flat' ? Number(invoice.discountValue) : subtotal * (Number(invoice.discountValue) / 100);
    const shipping = Number(invoice.shipping);
    const grandTotal = subtotal + tax + shipping - discount;
    return { subtotal, tax, discount, shipping, grandTotal };
  }, [invoice]);

  const template = invoiceTemplates.find((t) => t.id === templateId) || invoiceTemplates[0];

  const handleBarcode = (barcode) => {
    const product = products.find((p) => p.barcode === barcode);
    const item = product
      ? { ...newItem(), barcode, name: product.name, price: product.price, tax: product.tax }
      : { ...newItem(), barcode, name: 'Manual Product', price: 0, tax: 0 };
    setInvoice((prev) => ({ ...prev, items: [...prev.items, item] }));
  };

  const updateItem = (id, field, value) => {
    setInvoice((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, [field]: field === 'name' ? value : Number(value) || 0 } : i)) }));
  };

  const saveLocal = () => localStorage.setItem('invoice-builder-state', JSON.stringify({ invoice, templateId, products }));

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ invoice: { ...invoice, totals }, products }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const node = document.getElementById('invoice-preview');
    const canvas = await html2canvas(node, { scale: 2, useCORS: true });
    const pdf = new jsPDF('p', 'pt', 'a4');
    const img = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${invoice.invoiceNumber}.pdf`);
  };

  const importCsv = (file) => {
    Papa.parse(file, {
      header: true,
      complete: ({ data }) => {
        const sanitized = data.filter((d) => d.barcode && d.name).map((d) => ({ barcode: String(d.barcode), name: d.name, price: Number(d.price) || 0, tax: Number(d.tax) || 0 }));
        setProducts((prev) => [...prev, ...sanitized]);
      }
    });
  };

  const dashboardStats = {
    revenue: totals.grandTotal,
    invoices: invoice.items.length,
    pending: invoice.paymentStatus === 'Paid' ? 0 : totals.grandTotal
  };

  const signatureSrc = signatureImage || signatureData;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex">
        <aside className="sticky top-0 h-screen w-64 border-r border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-xl font-bold">Invoice Builder Pro</h1>
          <nav className="mt-6 space-y-2 text-sm">
            {['Dashboard', 'Invoice Builder', 'Templates', 'Products', 'Settings'].map((x) => <div key={x} className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700">{x}</div>)}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <header className="mb-6 flex items-center justify-between rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-800">
            <h2 className="text-lg font-semibold">SaaS Dashboard Overview</h2>
            <button onClick={() => setIsDark((v) => !v)} className="rounded-lg bg-slate-900 px-3 py-2 text-white dark:bg-slate-100 dark:text-slate-900">{isDark ? 'Light' : 'Dark'} Mode</button>
          </header>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-800"><p className="text-xs">Total Revenue</p><p className="text-2xl font-bold">{dashboardStats.revenue.toFixed(2)}</p></div>
            <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-800"><p className="text-xs">Total Invoices</p><p className="text-2xl font-bold">{dashboardStats.invoices}</p></div>
            <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-slate-800"><p className="text-xs">Pending Payments</p><p className="text-2xl font-bold">{dashboardStats.pending.toFixed(2)}</p></div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr,1fr]">
            <section className="space-y-4">
              <BarcodeScanner onDetected={handleBarcode} />
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-semibold">Client & Invoice Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['name', 'address', 'phone', 'gst', 'email'].map((f) => <input key={f} value={invoice.client[f]} onChange={(e) => setInvoice((p) => ({ ...p, client: { ...p.client, [f]: e.target.value } }))} placeholder={`Client ${f}`} className="rounded-lg border p-2 text-sm text-slate-900" />)}
                  <input value={invoice.date} onChange={(e) => setInvoice((p) => ({ ...p, date: e.target.value }))} type="date" className="rounded-lg border p-2 text-sm text-slate-900" />
                  <input value={invoice.dueDate} onChange={(e) => setInvoice((p) => ({ ...p, dueDate: e.target.value }))} type="date" className="rounded-lg border p-2 text-sm text-slate-900" />
                  <select value={invoice.currency} onChange={(e) => setInvoice((p) => ({ ...p, currency: e.target.value }))} className="rounded-lg border p-2 text-sm text-slate-900"><option>USD</option><option>EUR</option><option>INR</option><option>AED</option></select>
                  <select value={invoice.paymentStatus} onChange={(e) => setInvoice((p) => ({ ...p, paymentStatus: e.target.value }))} className="rounded-lg border p-2 text-sm text-slate-900"><option>Paid</option><option>Pending</option><option>Partial</option></select>
                  <select value={invoice.taxMode} onChange={(e) => setInvoice((p) => ({ ...p, taxMode: e.target.value }))} className="rounded-lg border p-2 text-sm text-slate-900"><option>GST</option><option>VAT</option><option>Custom Tax</option></select>
                  <select value={invoice.size} onChange={(e) => setInvoice((p) => ({ ...p, size: e.target.value }))} className="rounded-lg border p-2 text-sm text-slate-900"><option>A4</option><option>A5</option><option>Letter</option><option>Custom</option></select>
                  {invoice.size === 'Custom' && (
                    <>
                      <input placeholder="Width px" className="rounded-lg border p-2 text-sm text-slate-900" onChange={(e) => setCustomSize((p) => ({ ...p, width: `${e.target.value}px` }))} />
                      <input placeholder="Height px" className="rounded-lg border p-2 text-sm text-slate-900" onChange={(e) => setCustomSize((p) => ({ ...p, minHeight: `${e.target.value}px` }))} />
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-semibold">Line Items</h3>
                <div className="space-y-2">
                  {invoice.items.map((item) => (
                    <div className="grid grid-cols-6 gap-2" key={item.id}>
                      <input value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} placeholder="Name" className="rounded-lg border p-2 text-sm text-slate-900" />
                      <input value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} type="number" className="rounded-lg border p-2 text-sm text-slate-900" />
                      <input value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} type="number" className="rounded-lg border p-2 text-sm text-slate-900" />
                      <input value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} type="number" className="rounded-lg border p-2 text-sm text-slate-900" />
                      <input value={item.discount} onChange={(e) => updateItem(item.id, 'discount', e.target.value)} type="number" className="rounded-lg border p-2 text-sm text-slate-900" />
                      <input value={item.barcode} onChange={(e) => updateItem(item.id, 'barcode', e.target.value)} placeholder="Barcode" className="rounded-lg border p-2 text-sm text-slate-900" />
                    </div>
                  ))}
                </div>
                <button onClick={() => setInvoice((p) => ({ ...p, items: [...p.items, newItem()] }))} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500">Add Item</button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-semibold">Charges & Discounts</h3>
                <div className="grid grid-cols-2 gap-2">
                  <select value={invoice.discountType} onChange={(e) => setInvoice((p) => ({ ...p, discountType: e.target.value }))} className="rounded-lg border p-2 text-sm text-slate-900"><option value="flat">Flat</option><option value="percentage">Percentage</option></select>
                  <input type="number" value={invoice.discountValue} onChange={(e) => setInvoice((p) => ({ ...p, discountValue: e.target.value }))} placeholder="Discount" className="rounded-lg border p-2 text-sm text-slate-900" />
                  <input type="number" value={invoice.shipping} onChange={(e) => setInvoice((p) => ({ ...p, shipping: e.target.value }))} placeholder="Shipping" className="rounded-lg border p-2 text-sm text-slate-900" />
                  <input value={invoice.invoiceNumber} onChange={(e) => setInvoice((p) => ({ ...p, invoiceNumber: e.target.value }))} placeholder="Invoice Number" className="rounded-lg border p-2 text-sm text-slate-900" />
                  <textarea value={invoice.notes} onChange={(e) => setInvoice((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="col-span-2 rounded-lg border p-2 text-sm text-slate-900" />
                  <textarea value={invoice.terms} onChange={(e) => setInvoice((p) => ({ ...p, terms: e.target.value }))} placeholder="Terms" className="col-span-2 rounded-lg border p-2 text-sm text-slate-900" />
                </div>
              </div>

              <SignaturePadSection signatureData={signatureData} setSignatureData={setSignatureData} signatureImage={signatureImage} setSignatureImage={setSignatureImage} />

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-semibold">Signature Styles & Position</h3>
                <div className="grid grid-cols-3 gap-2">
                  {signatureFonts.map((font, idx) => (
                    <button key={font} onClick={() => setSignatureStyle(font)} className={`rounded-lg border p-2 text-left text-sm ${font} ${signatureStyle === font ? 'border-indigo-500' : ''}`}>Signature {idx + 1}</button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input type="number" value={signatureMeta.x} onChange={(e) => setSignatureMeta((p) => ({ ...p, x: Number(e.target.value) }))} className="rounded-lg border p-2 text-sm text-slate-900" placeholder="X" />
                  <input type="number" value={signatureMeta.y} onChange={(e) => setSignatureMeta((p) => ({ ...p, y: Number(e.target.value) }))} className="rounded-lg border p-2 text-sm text-slate-900" placeholder="Y" />
                  <input type="number" value={signatureMeta.width} onChange={(e) => setSignatureMeta((p) => ({ ...p, width: Number(e.target.value) }))} className="rounded-lg border p-2 text-sm text-slate-900" placeholder="Width" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <motion.button whileHover={{ scale: 1.03 }} onClick={saveLocal} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Save Local</motion.button>
                <motion.button whileHover={{ scale: 1.03 }} onClick={downloadJson} className="rounded-lg bg-slate-700 px-4 py-2 text-white">Download JSON</motion.button>
                <motion.button whileHover={{ scale: 1.03 }} onClick={exportPdf} className="rounded-lg bg-emerald-600 px-4 py-2 text-white">Export PDF</motion.button>
                <label className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-white">Import CSV<input type="file" accept=".csv" className="hidden" onChange={(e) => importCsv(e.target.files?.[0])} /></label>
              </div>
            </section>

            <section className="space-y-4 overflow-auto">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-semibold">20 Invoice Templates</h3>
                <div className="grid grid-cols-2 gap-2">
                  {invoiceTemplates.map((t) => (
                    <button key={t.id} onClick={() => setTemplateId(t.id)} className={`rounded-lg border p-2 text-left text-sm transition hover:-translate-y-0.5 ${templateId === t.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : ''}`}>{t.name}</button>
                  ))}
                </div>
              </div>
              <div className={signatureStyle}>
                <InvoicePreview
                  invoice={{ ...invoice, totals }}
                  template={template}
                  signature={{ src: signatureSrc, ...signatureMeta }}
                  customSize={customSize}
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

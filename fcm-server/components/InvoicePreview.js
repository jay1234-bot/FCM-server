import { motion } from 'framer-motion';
import clsx from 'clsx';

const sizeMap = {
  A4: { width: '794px', minHeight: '1123px' },
  A5: { width: '559px', minHeight: '794px' },
  Letter: { width: '816px', minHeight: '1056px' }
};

export default function InvoicePreview({ invoice, template, signature, customSize }) {
  const box = invoice.size === 'Custom' ? customSize : sizeMap[invoice.size];
  return (
    <motion.div
      key={template.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      id="invoice-preview"
      className={clsx('relative rounded-2xl p-6 shadow-soft', template.invoice)}
      style={{ width: box.width, minHeight: box.minHeight }}
    >
      <div className={clsx('mb-6 rounded-xl px-4 py-3', template.accent)}>
        <h2 className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</h2>
        <p className="text-sm">{invoice.date} • Due {invoice.dueDate}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold">Bill To</p>
          <p>{invoice.client.name}</p><p>{invoice.client.address}</p><p>{invoice.client.phone}</p>
          <p>{invoice.client.email}</p><p>{invoice.client.gst}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">Payment Status</p>
          <p>{invoice.paymentStatus}</p>
          <p>Currency: {invoice.currency}</p>
        </div>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead><tr className="border-b"><th>Item</th><th>Qty</th><th>Price</th><th>Tax</th><th>Total</th></tr></thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b/30 border-b">
              <td className="py-2">{item.name}</td><td>{item.qty}</td><td>{item.price.toFixed(2)}</td>
              <td>{item.tax}%</td><td>{(item.qty * item.price * (1 + item.tax / 100)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 space-y-1 text-right text-sm">
        <p>Subtotal: {invoice.totals.subtotal.toFixed(2)}</p>
        <p>Discount: -{invoice.totals.discount.toFixed(2)}</p>
        <p>Shipping: {invoice.totals.shipping.toFixed(2)}</p>
        <p>Tax: {invoice.totals.tax.toFixed(2)}</p>
        <p className="text-lg font-bold">Grand Total: {invoice.totals.grandTotal.toFixed(2)}</p>
      </div>
      <div className="mt-6 text-xs">
        <p><b>Notes:</b> {invoice.notes}</p>
        <p><b>Terms:</b> {invoice.terms}</p>
      </div>
      {signature.src && (
        <img
          src={signature.src}
          alt="signature"
          className="absolute object-contain"
          style={{ width: signature.width, left: signature.x, bottom: signature.y }}
        />
      )}
    </motion.div>
  );
}

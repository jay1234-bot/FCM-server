import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function SignaturePadSection({ signatureData, setSignatureData, signatureImage, setSignatureImage }) {
  const sigRef = useRef(null);

  const saveSignature = () => {
    if (!sigRef.current?.isEmpty()) {
      setSignatureData(sigRef.current.getTrimmedCanvas().toDataURL('image/png'));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-3 text-sm font-semibold">Digital Signature</h3>
      <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
        <SignatureCanvas ref={sigRef} canvasProps={{ className: 'h-32 w-full' }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white" onClick={saveSignature}>Save Drawn</button>
        <button className="rounded-lg bg-slate-200 px-3 py-2 text-sm" onClick={() => sigRef.current?.clear()}>Clear</button>
        <label className="cursor-pointer rounded-lg bg-slate-200 px-3 py-2 text-sm">
          Upload Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setSignatureImage(reader.result);
              reader.readAsDataURL(file);
            }}
          />
        </label>
      </div>
      {(signatureData || signatureImage) && <p className="mt-2 text-xs text-emerald-600">Signature ready for invoice.</p>}
    </div>
  );
}

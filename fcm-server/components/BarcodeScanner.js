import { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';

export default function BarcodeScanner({ onDetected }) {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerConnected, setScannerConnected] = useState(false);

  useEffect(() => {
    const checkScanner = async () => {
      if (!navigator?.hid) {
        setScannerConnected(false);
        return;
      }
      const devices = await navigator.hid.getDevices();
      setScannerConnected(devices.length > 0);
    };

    checkScanner();
    navigator?.hid?.addEventListener('connect', checkScanner);
    navigator?.hid?.addEventListener('disconnect', checkScanner);
    return () => {
      navigator?.hid?.removeEventListener('connect', checkScanner);
      navigator?.hid?.removeEventListener('disconnect', checkScanner);
    };
  }, []);

  const startScanning = () => {
    if (isScanning || !scannerRef.current) return;
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: { facingMode: 'environment' }
        },
        decoder: { readers: ['ean_reader', 'ean_8_reader', 'code_128_reader'] }
      },
      (err) => {
        if (err) return;
        Quagga.start();
        setIsScanning(true);
      }
    );

    Quagga.onDetected((result) => {
      const code = result?.codeResult?.code;
      if (code) {
        onDetected(code);
        stopScanning();
      }
    });
  };

  const stopScanning = () => {
    Quagga.stop();
    Quagga.offDetected();
    setIsScanning(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Barcode Scanner</h3>
        <span className={`rounded-full px-3 py-1 text-xs ${scannerConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {scannerConnected ? 'Scanner Connected' : 'No Scanner Detected – Using Camera Mode'}
        </span>
      </div>
      <div ref={scannerRef} className="h-48 overflow-hidden rounded-xl bg-slate-900" />
      <div className="mt-3 flex gap-2">
        <button onClick={startScanning} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500">Start</button>
        <button onClick={stopScanning} className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300">Stop</button>
      </div>
    </div>
  );
}

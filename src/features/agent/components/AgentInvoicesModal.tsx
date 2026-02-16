"use client";

import { useEffect, useState, useRef } from "react";
import { InsuranceForm, getMyInsuranceForms, regenerateInvoice, uploadWeighmentSlips, RegenerateInvoicePayload } from "@/features/insurance/api";
import Cropper, { ReactCropperElement } from "react-cropper";
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import 'cropperjs/dist/cropper.css';

interface AgentInvoicesModalProps {
  open: boolean;
  onClose: () => void;
}

export function AgentInvoicesModal({ open, onClose }: AgentInvoicesModalProps) {
  const [invoices, setInvoices] = useState<InsuranceForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InsuranceForm | null>(null);
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  
  // Regenerate form states
  const [formData, setFormData] = useState<RegenerateInvoicePayload>({
    invoiceId: '',
    supplierName: '',
    supplierAddress: [''],
    placeOfSupply: '',
    billToName: '',
    billToAddress: [''],
    shipToName: '',
    shipToAddress: [''],
    productName: '',
    hsnCode: '',
    quantity: 0,
    rate: 0,
    amount: 0,
    vehicleNumber: '',
    truckNumber: '',
    weighmentSlipNote: '',
    invoiceType: 'BUYER_INVOICE',
    invoiceDate: new Date().toISOString().split('T')[0],
  });
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  
  // Cropper & File State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isCropperReady, setIsCropperReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [weightmentSlip, setWeightmentSlip] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyInsuranceForms();
        setInvoices(data);
      } catch (e: any) {
        setError(e.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [open]);

  const handleEditInvoice = (invoice: InsuranceForm) => {
    setSelectedInvoice(invoice);
    setWeightmentSlip(null);
    setFormData({
      invoiceId: invoice.id,
      supplierName: invoice.supplierName,
      supplierAddress: invoice.supplierAddress || [''],
      placeOfSupply: invoice.placeOfSupply || '',
      billToName: invoice.billToName,
      billToAddress: invoice.billToAddress || [''],
      shipToName: invoice.shipToName || '',
      shipToAddress: invoice.shipToAddress || [''],
      productName: Array.isArray(invoice.productName)
        ? invoice.productName[0] || ''
        : invoice.productName || '',
      hsnCode: invoice.hsnCode || '',
      quantity: invoice.quantity || 0,
      rate: invoice.rate || 0,
      amount: invoice.amount || 0,
      vehicleNumber: invoice.vehicleNumber || '',
      truckNumber: invoice.truckNumber || '',
      weighmentSlipNote: invoice.weighmentSlipNote || '',
      invoiceType: invoice.invoiceType || 'BUYER_INVOICE',
      invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
    });
    setShowRegenerateForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setIsCropping(true);
        setIsCropperReady(false);
        setRotation(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const rotateImage = (degrees: number) => {
    setRotation(prev => (prev + degrees) % 360);
    cropperRef.current?.cropper.rotateTo(rotation + degrees);
  };

  const handleCropComplete = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.getCroppedCanvas({
      minWidth: 300, minHeight: 300, maxWidth: 4096, maxHeight: 4096,
      fillColor: '#fff', imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
    }).toBlob(blob => {
      if (blob) {
        setWeightmentSlip(new File([blob], 'updated-weightment-slip.jpg', { type: 'image/jpeg' }));
        setIsCropping(false);
        setImageSrc(null);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleRegenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setRegenerating(true);
    setRegenerateError(null);

    try {
      // 1. Upload Image if exists
      if (weightmentSlip) {
        await uploadWeighmentSlips(selectedInvoice.id, [weightmentSlip]);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing
      }

      // 2. Prepare payload
      const payload: RegenerateInvoicePayload = {
        invoiceId: selectedInvoice.id,
        invoiceType: formData.invoiceType,
        invoiceDate: formData.invoiceDate,
        supplierName: formData.supplierName,
        placeOfSupply: formData.placeOfSupply,
        billToName: formData.billToName,
        shipToName: formData.shipToName,
        hsnCode: formData.hsnCode,
        vehicleNumber: formData.vehicleNumber,
        truckNumber: formData.truckNumber,
        weighmentSlipNote: formData.weighmentSlipNote,
        productName: formData.productName,
        quantity: formData.quantity,
        rate: formData.rate,
        amount: (Number(formData.quantity) || 0) * (Number(formData.rate) || 0),
        supplierAddress: Array.isArray(formData.supplierAddress) 
          ? formData.supplierAddress.filter(addr => addr.trim())
          : [String(formData.supplierAddress || '')],
        billToAddress: Array.isArray(formData.billToAddress)
          ? formData.billToAddress.filter(addr => addr.trim())
          : [String(formData.billToAddress || '')],
        shipToAddress: Array.isArray(formData.shipToAddress)
          ? formData.shipToAddress.filter(addr => addr.trim())
          : [String(formData.shipToAddress || '')],
      };

      await regenerateInvoice(payload);
      
      // Refresh invoices list
      const refreshed = await getMyInsuranceForms();
      setInvoices(refreshed);
      
      // Close regenerate form
      setShowRegenerateForm(false);
      setSelectedInvoice(null);
      setWeightmentSlip(null);
      setRegenerateError(null);
    } catch (err: any) {
      const errorMsg = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || 'Failed to regenerate invoice';
      setRegenerateError(errorMsg);
    } finally {
      setRegenerating(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        {/* Main invoice list modal */}
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto relative">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-3xl">
            <h3 className="text-xl font-bold text-slate-800">My Invoices</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            {loading && (
              <div className="text-center py-8 text-gray-500">Loading invoices...</div>
            )}
            {!loading && error && (
              <div className="text-center py-8 text-red-500 text-sm">{error}</div>
            )}
            {!loading && !error && invoices.length === 0 && (
              <div className="text-center py-8 text-gray-500">No invoices found</div>
            )}
            {!loading && !error && invoices.length > 0 && (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border rounded-2xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          {invoice.invoiceNumber}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {invoice.supplierName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {invoice.createdAt
                            ? new Date(invoice.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">
                          ₹{invoice.amount?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {invoice.pdfUrl && (
                        <a
                          href={`${invoice.pdfUrl}?t=${Date.now()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 text-center"
                        >
                          📄 View PDF
                        </a>
                      )}
                      <button
                        onClick={() => handleEditInvoice(invoice)}
                        className="flex-1 bg-[#4309ac] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#350889]"
                      >
                        ✏️ Edit & Regenerate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cropper Overlay */}
      {isCropping && imageSrc && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex-1 w-full relative min-h-0 bg-black">
            <Cropper
              src={imageSrc}
              style={{ height: '100%', width: '100%' }}
              ref={cropperRef}
              initialAspectRatio={NaN}
              guides={true}
              viewMode={1}
              dragMode="move"
              responsive={true}
              autoCropArea={1}
              checkOrientation={true}
              background={false}
              ready={() => {
                setIsCropperReady(true);
                setRotation(0);
              }}
              minCropBoxHeight={10}
              minCropBoxWidth={10}
              autoCrop={true}
              aspectRatio={NaN}
              restore={false}
              zoomable={true}
              zoomOnWheel={true}
              zoomOnTouch={true}
              toggleDragModeOnDblclick={true}
              cropBoxMovable={true}
              cropBoxResizable={true}
            />
          </div>
          <div className="w-full bg-black/90 p-4 pb-8 flex justify-between items-center px-6 shrink-0 z-50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotateImage(-90)}
                className="flex flex-col items-center text-white gap-1"
                title="Rotate Left 90°"
              >
                <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                  <ArrowPathIcon className="w-5 h-5 transform rotate-90" />
                </div>
                <span className="text-xs">⟲ Left</span>
              </button>
              <button
                type="button"
                onClick={() => rotateImage(90)}
                className="flex flex-col items-center text-white gap-1"
                title="Rotate Right 90°"
              >
                <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                  <ArrowPathIcon className="w-5 h-5 -scale-x-100 transform rotate-90" />
                </div>
                <span className="text-xs">⟳ Right</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setIsCropping(false);
                  setImageSrc(null);
                  setWeightmentSlip(null);
                  setRotation(0);
                }}
                className="flex flex-col items-center text-red-500 gap-1"
              >
                <div className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
                  <XMarkIcon className="w-6 h-6" />
                </div>
                <span className="text-xs">Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleCropComplete}
                disabled={!isCropperReady}
                className={`flex flex-col items-center gap-1 transition-opacity ${isCropperReady ? 'opacity-100 text-[#25D366]' : 'opacity-50 text-gray-500'}`}
              >
                <div className={`p-2 rounded-full bg-gray-800 border ${isCropperReady ? 'border-[#25D366]' : 'border-gray-500'} hover:bg-gray-700`}>
                  <CheckIcon className="w-6 h-6" />
                </div>
                <span className="text-xs">Done</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Form Modal */}
      {showRegenerateForm && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[55] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-3xl">
              <h3 className="text-xl font-bold text-slate-800">Update Invoice</h3>
              <button
                onClick={() => {
                  setShowRegenerateForm(false);
                  setSelectedInvoice(null);
                  setRegenerateError(null);
                  setWeightmentSlip(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegenerateSubmit} className="p-6 space-y-4">
              {regenerateError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-sm">
                  {regenerateError}
                </div>
              )}

              {/* Weightment Slip Upload Section */}
              <div className="border border-gray-300 rounded-xl p-4">
                <label className="block text-sm font-medium text-slate-800 mb-2">Upload Weighment Slip</label>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="flex flex-col gap-3">
                  {weightmentSlip ? (
                    <div className="text-green-700 text-sm bg-green-50 p-2 rounded">{weightmentSlip.name}</div>
                  ) : (
                    <div className="text-gray-500 text-sm text-center">No new slip selected</div>
                  )}
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                    📸 {weightmentSlip ? 'Replace Photo' : 'Upload New Photo'}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                Invoice: <span className="font-semibold">{selectedInvoice.invoiceNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Invoice Type</label>
                  <select
                    value={formData.invoiceType}
                    onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  >
                    <option value="BUYER_INVOICE">Buyer Invoice</option>
                    <option value="SUPPLIER_INVOICE">Supplier Invoice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Supplier Address</label>
                <textarea
                  value={Array.isArray(formData.supplierAddress) ? formData.supplierAddress[0] : formData.supplierAddress}
                  onChange={(e) => setFormData({ ...formData, supplierAddress: [e.target.value] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter supplier address"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Bill To Name</label>
                <input
                  type="text"
                  value={formData.billToName}
                  onChange={(e) => setFormData({ ...formData, billToName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter buyer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Bill To Address</label>
                <textarea
                  value={Array.isArray(formData.billToAddress) ? formData.billToAddress[0] : formData.billToAddress}
                  onChange={(e) => setFormData({ ...formData, billToAddress: [e.target.value] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter buyer address"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Ship To Name</label>
                <input
                  type="text"
                  value={formData.shipToName}
                  onChange={(e) => setFormData({ ...formData, shipToName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter ship to name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Ship To Address</label>
                <textarea
                  value={Array.isArray(formData.shipToAddress) ? formData.shipToAddress[0] : formData.shipToAddress}
                  onChange={(e) => setFormData({ ...formData, shipToAddress: [e.target.value] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter shipping address"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Place of Supply</label>
                <input
                  type="text"
                  value={formData.placeOfSupply}
                  onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter place of supply"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                    placeholder="Enter HSN code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                    placeholder="Enter vehicle number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Weighment Slip Note</label>
                <textarea
                  value={formData.weighmentSlipNote}
                  onChange={(e) => setFormData({ ...formData, weighmentSlipNote: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white"
                  placeholder="Enter any additional notes"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegenerateForm(false);
                    setSelectedInvoice(null);
                    setRegenerateError(null);
                    setWeightmentSlip(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                  disabled={regenerating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regenerating}
                  className="flex-1 px-4 py-3 bg-[#4309ac] text-white rounded-xl font-medium hover:bg-[#350889] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regenerating ? 'Updating...' : 'Update & Regenerate PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


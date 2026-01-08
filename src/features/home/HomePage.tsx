"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../auth/components/ProtectedRoute";
import { getMyInsuranceForms, regenerateInvoice, InsuranceForm, RegenerateInvoicePayload } from "../insurance/api";

interface User {
  mobileNumber?: string;
}

const HomePage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User>({});
  const [isMounted, setIsMounted] = useState(false);

  // Invoice states
  const [invoices, setInvoices] = useState<InsuranceForm[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/");
      return;
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, [router]);

  // Fetch invoices when modal opens
  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const data = await getMyInsuranceForms();
      setInvoices(data);
    } catch (err: any) {
      console.error('Failed to fetch invoices:', err);
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleOpenInvoiceModal = () => {
    setShowInvoiceModal(true);
    fetchInvoices();
  };

  const handleEditInvoice = (invoice: InsuranceForm) => {
    setSelectedInvoice(invoice);
    setFormData({
      invoiceId: invoice.id,
      supplierName: invoice.supplierName,
      supplierAddress: invoice.supplierAddress || [''],
      placeOfSupply: invoice.placeOfSupply,
      billToName: invoice.billToName,
      billToAddress: invoice.billToAddress || [''],
      shipToName: invoice.shipToName || '',
      shipToAddress: invoice.shipToAddress || [''],
      productName: invoice.productName?.[0] || '',
      hsnCode: invoice.hsnCode || '',
      quantity: invoice.quantity || 0,
      rate: invoice.rate || 0,
      amount: invoice.amount || 0,
      vehicleNumber: invoice.vehicleNumber || '',
      truckNumber: invoice.truckNumber || '',
      weighmentSlipNote: invoice.weighmentSlipNote || '',
      invoiceType: 'BUYER_INVOICE', // Default to BUYER_INVOICE since invoiceType doesn't exist on InsuranceForm
      invoiceDate: invoice.invoiceDate || new Date().toISOString().split('T')[0],
    });
    setShowRegenerateForm(true);
  };

  const handleRegenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    setRegenerating(true);
    setError(null);

    try {
      const { invoiceId, ...formDataWithoutId } = formData;
      // Ensure all address fields are properly typed as string arrays
      const supplierAddress = Array.isArray(formData.supplierAddress)
        ? formData.supplierAddress.filter((addr): addr is string => typeof addr === 'string')
        : [String(formData.supplierAddress || '')];

      const billToAddress = Array.isArray(formData.billToAddress)
        ? formData.billToAddress.filter((addr): addr is string => typeof addr === 'string')
        : [String(formData.billToAddress || '')];

      const shipToAddress = formData.shipToAddress
        ? (Array.isArray(formData.shipToAddress)
          ? formData.shipToAddress.filter((addr): addr is string => typeof addr === 'string')
          : [String(formData.shipToAddress)])
        : [''];

      const payload: RegenerateInvoicePayload = {
        ...formDataWithoutId,
        invoiceId: selectedInvoice.id,
        productName: formData.productName || '',
        supplierAddress,
        billToAddress,
        shipToAddress,
      };

      const updatedInvoice = await regenerateInvoice(payload);

      // Update the invoice in the list
      setInvoices(prev =>
        prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv)
      );

      // Success feedback
      alert('✅ Invoice updated successfully! PDF will be regenerated shortly.');

      // Close forms
      setShowRegenerateForm(false);
      setSelectedInvoice(null);
    } catch (err: any) {
      const errorMsg = Array.isArray(err.message)
        ? err.message.join(', ')
        : err.message || 'Failed to regenerate invoice';
      setError(errorMsg);
    } finally {
      setRegenerating(false);
    }
  };

  const username = user.mobileNumber || "user";

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
    }
    router.push("/");
  };

  if (!isMounted) {
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#e0d7fc] pb-28">
        {/* HEADER */}
        <div className="bg-white text-black px-5 py-4 rounded-b-4xl">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center bg-white px-2 py-1 rounded-2xl -ml-2">
              <h2
                className="text-2xl font-bold tracking-tight -ml-10"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                <span className="text-slate-800">Mandi</span>
                <span className="text-[#4309ac]">Plus</span>
              </h2>
              <p className="text-xs font-medium">
                <span className="text-black">Risk Humara, </span>
                <span className="text-[#4309ac]">Munafa Aapka</span>
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="bg-white bg-opacity-20 backdrop-blur-sm hover:bg-opacity-30 text-purple-900 px-2 py-1 rounded-2xl text-sm font-medium flex items-center space-x-1 transition-all duration-300 border border-white border-opacity-20"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* SERVICES */}
        <div className="px-5 mt-5">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Our Services</h2>

          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-white rounded-3xl p-4 shadow-sm cursor-pointer"
              onClick={() => router.push("/tracking")}
            >
              <h4 className="font-semibold mb-1 text-slate-800">Track Deliveries</h4>
              <p className="text-xs text-gray-500">Real-time updates</p>
            </div>

            <div
              className="bg-white rounded-3xl p-4 shadow-sm cursor-pointer"
              onClick={() => router.push("/insurance")}
            >
              <h4 className="font-semibold mb-1 text-slate-800">Create Insurance Forms</h4>
              <p className="text-xs text-gray-500 mb-2">
                Get policy instantly
              </p>
            </div>

            <div
              className="bg-white rounded-3xl p-4 shadow-sm cursor-pointer"
              onClick={() => router.push("/know-your-vehicle")}
            >
              <h4 className="font-semibold mb-1 text-slate-800">Know Your Vehicle</h4>
              <p className="text-xs text-gray-500">
                Check vehicle details
              </p>
            </div>

            {/* Updated My Policies Card */}
            <div
              className="bg-white rounded-3xl p-4 shadow-sm cursor-pointer"
              onClick={handleOpenInvoiceModal}
            >
              <h4 className="font-semibold mb-1 text-slate-800">My Policies</h4>
              <p className="text-xs text-gray-500">View & Edit forms</p>
            </div>
          </div>
        </div>

        {/* DO MORE */}
        <div className="px-5 mt-5">
          <h2
            className="text-2xl mb-2 font-bold tracking-tight"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            <span className="text-slate-800">Do more with Mandi</span>
            <span className="text-[#4309ac]">Plus</span>
          </h2>

          <div className="bg-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-slate-800">
                Explore our other Products
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                From all RTOs
              </p>
            </div>
            <span className="text-xl text-slate-800">→</span>
          </div>
        </div>

        {/* INVOICE LIST MODAL */}
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-3xl">
                <h3 className="text-xl font-bold text-slate-800">My Invoices</h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {loadingInvoices ? (
                  <div className="text-center py-8 text-gray-500">Loading invoices...</div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No invoices found</div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="border rounded-2xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-800">{invoice.invoiceNumber}</h4>
                            <p className="text-sm text-gray-600">{invoice.supplierName}</p>
                            <p className="text-xs text-gray-500">{invoice.invoiceDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">₹{invoice.amount?.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
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
        )}

        {/* REGENERATE FORM MODAL */}
        {showRegenerateForm && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-3xl">
                <h3 className="text-xl font-bold text-slate-800">Update Invoice</h3>
                <button
                  onClick={() => {
                    setShowRegenerateForm(false);
                    setSelectedInvoice(null);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegenerateSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-sm">
                    {error}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                  Invoice: <span className="font-semibold">{selectedInvoice.invoiceNumber}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Invoice Type
                    </label>
                    <select
                      value={formData.invoiceType}
                      onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    >
                      <option value="BUYER_INVOICE">Buyer Invoice</option>
                      <option value="SUPPLIER_INVOICE">Supplier Invoice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Supplier Address
                  </label>
                  <textarea
                    value={Array.isArray(formData.supplierAddress) ? formData.supplierAddress[0] : formData.supplierAddress}
                    onChange={(e) => setFormData({ ...formData, supplierAddress: [e.target.value] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    placeholder="Enter supplier address"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Bill To Name
                  </label>
                  <input
                    type="text"
                    value={formData.billToName}
                    onChange={(e) => setFormData({ ...formData, billToName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    placeholder="Enter buyer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Bill To Address
                  </label>
                  <textarea
                    value={Array.isArray(formData.billToAddress) ? formData.billToAddress[0] : formData.billToAddress}
                    onChange={(e) => setFormData({ ...formData, billToAddress: [e.target.value] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    placeholder="Enter buyer address"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Ship To Name
                  </label>
                  <input
                    type="text"
                    value={formData.shipToName}
                    onChange={(e) => setFormData({ ...formData, shipToName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    placeholder="Enter ship to name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Ship To Address
                  </label>
                  <textarea
                    value={Array.isArray(formData.shipToAddress) ? formData.shipToAddress[0] : formData.shipToAddress}
                    onChange={(e) => setFormData({ ...formData, shipToAddress: [e.target.value] })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    placeholder="Enter shipping address"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Place of Supply
                  </label>
                  <input
                    type="text"
                    value={formData.placeOfSupply}
                    onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                    placeholder="Enter place of supply"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      HSN Code
                    </label>
                    <input
                      type="text"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                      placeholder="Enter HSN code"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                      placeholder="0.00"
                    />
                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                      placeholder="Enter vehicle number"
                    />
                  </div>

                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 mb-1">
                    Weighment Slip Note
                  </label>
                  <textarea
                    value={formData.weighmentSlipNote}
                    onChange={(e) => setFormData({ ...formData, weighmentSlipNote: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
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
                      setError(null);
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

        {/* BOTTOM NAV */}
        <div className="fixed bottom-0 left-0 right-0 bg-black text-white rounded-t-[28px] py-3">
          <div className="flex justify-around items-center text-xs">
            <div className="flex flex-col items-center opacity-60">
              ⬜
              <span>Explore</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center -mt-6">
                👤
              </div>
              <span className="mt-1">Home</span>
            </div>

            <div className="flex flex-col items-center opacity-60">
              💬
              <span>Support</span>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default HomePage;
"use client";

import { useState, useEffect } from "react";
import { useOutlet } from "@/contexts/OutletContext";
import api from "@/lib/api";
import { Barcode, Printer } from "lucide-react";

export default function BarcodePage() {
  const { selectedOutlet } = useOutlet();
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [labelSize, setLabelSize] = useState("2x1");
  const [quantity, setQuantity] = useState("1");
  const [barcodePreview, setBarcodePreview] = useState("");
  const [previewQuantity, setPreviewQuantity] = useState(1); // Only updated when user clicks Generate Preview
  const [productName, setProductName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedOutlet) {
      fetchProducts();
    }
  }, [selectedOutlet]);

  const fetchProducts = async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    try {
      const res = await api.get(`/raw-materials?outlet_id=${selectedOutlet.id}&limit=1000`);
      const allProducts = res.data.filter((item: any) => item.for_direct_sale);
      setProducts(allProducts);
      const cats = Array.from(new Set(allProducts.map((p: any) => p.supplier_name || "General"))) as string[];
      setCategories(cats);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const product = products.find((p) => p.id === parseInt(productId));
    if (product) {
      setProductName(product.name);
      // Clear preview when changing product
      setBarcodePreview("");
    }
  };

  const handleGeneratePreview = () => {
    if (!selectedProduct) return;
    // Set the barcode preview and snapshot quantity only when user clicks Generate Preview
    setBarcodePreview(selectedProduct);
    setPreviewQuantity(Math.max(1, parseInt(quantity, 10) || 1));
  };

  const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") : "http://localhost:8000";

  const handlePrintLabels = () => {
    if (!selectedProduct || !barcodePreview || !productName) return;
    // Open a new window with only the barcode labels for barcode printer (no sidebar/layout)
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print barcode labels.");
      return;
    }
    const labelWidth = labelSize === "2x1" ? "192px" : labelSize === "3x2" ? "216px" : "256px";
    const labelMinHeight = labelSize === "2x1" ? "96px" : labelSize === "3x2" ? "144px" : "128px";
    const isSmall = labelSize === "2x1";
    const barcodeImgUrl = `${apiBase}/barcodes/generate/${barcodePreview}?width=${getBarcodeWidth()}&height=${getBarcodeHeight()}`;
    const cardsHtml = Array.from({ length: previewQuantity }, () => `
      <div class="label-card" style="
        width: ${labelWidth}; min-height: ${labelMinHeight};
        padding: ${isSmall ? "6px 8px" : "14px 16px"};
        box-sizing: border-box;
        border: 1px solid #ccc;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        break-inside: avoid;
        page-break-inside: avoid;
      ">
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; max-height: ${isSmall ? "40px" : "56px"}; margin-bottom: ${isSmall ? "4px" : "8px"};">
          <img src="${barcodeImgUrl}" alt="${productName.replace(/"/g, "&quot;")}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
        </div>
        <div style="text-align: center; font-weight: bold; font-size: ${isSmall ? "8px" : "11px"}; color: #111; text-transform: uppercase;">${productName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        <div style="text-align: center; font-size: ${isSmall ? "7px" : "11px"}; color: #444;">${productName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
      </div>
    `).join("");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Labels - ${productName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { padding: 8px; display: flex; flex-wrap: wrap; gap: 16px; background: white; }
            @media print { body { padding: 0; } .label-card { box-shadow: none; } }
          </style>
        </head>
        <body>${cardsHtml}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => (p.supplier_name || "General") === selectedCategory)
    : products;

  // Barcode image dimensions: width = module width (×0.1 mm), height = bar height (mm)
  const getBarcodeWidth = () => {
    switch (labelSize) {
      case "2x1": return 2;
      case "3x2": return 3;
      case "4x2": return 4;
      default: return 2;
    }
  };
  const getBarcodeHeight = () => {
    switch (labelSize) {
      case "2x1": return 8;
      case "3x2": return 12;
      case "4x2": return 15;
      default: return 8;
    }
  };

  return (
    <div className="h-screen flex animate-in fade-in duration-500 overflow-hidden">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      {/* Barcode Preview Section */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
        <div className="flex justify-between items-center no-print">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Barcode Management</h1>
            <p className="text-sm text-text-secondary">Generate and print barcode labels for your products</p>
          </div>
        </div>

        {/* Barcode Preview Area - visible on screen and when printing */}
        <div className="flex-1 overflow-y-auto">
          <div className={`bg-surface rounded-lg border border-border overflow-hidden h-full flex ${barcodePreview && productName ? "items-start justify-start p-4" : "items-center justify-center"}`}>
            {barcodePreview && productName ? (
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: previewQuantity }, (_, i) => {
                  const isSmall = labelSize === "2x1";
                  return (
                  <div
                    key={i}
                    className="bg-white rounded-md border-2 border-dashed border-gray-300 shadow-md flex flex-col items-center justify-center overflow-hidden flex-shrink-0 print:border print:border-gray-400"
                    style={{
                      width: labelSize === "2x1" ? "192px" : labelSize === "3x2" ? "216px" : "256px",
                      minHeight: labelSize === "2x1" ? "96px" : labelSize === "3x2" ? "144px" : "128px",
                      padding: isSmall ? "6px 8px" : "14px 16px",
                    }}
                  >
                    <div className={`w-full flex justify-center items-center flex-1 min-h-0 ${isSmall ? "mb-1" : "mb-2"}`} style={{ maxHeight: isSmall ? "40px" : "56px" }}>
                      <img
                        src={`http://localhost:8000/barcodes/generate/${barcodePreview}?width=${getBarcodeWidth()}&height=${getBarcodeHeight()}`}
                        alt={`Barcode for ${productName}`}
                        className="max-w-full max-h-full w-auto h-auto object-contain block"
                      />
                    </div>
                    <div className="text-center w-full flex-shrink-0 overflow-hidden">
                      <p className={`font-bold text-gray-900 uppercase leading-tight break-words ${isSmall ? "text-[8px]" : "text-[11px] leading-snug"}`} style={{ wordBreak: "break-word" }}>{productName}</p>
                      <p className={`text-gray-600 lowercase leading-tight break-words ${isSmall ? "text-[7px] mt-0.5" : "text-[11px] leading-snug mt-0.5"}`} style={{ wordBreak: "break-word" }}>{productName}</p>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-text-muted">
                <Barcode size={80} className="mx-auto mb-6 opacity-30" />
                <p className="text-base">Select a product and click Generate Preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generator Settings Section - hidden when printing */}
      <div className="w-96 flex flex-col bg-surface border-l border-border shrink-0 no-print">
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">Generator Settings</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Category */}
          <div>
            <label className="text-xs font-bold text-text-primary mb-2 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                const cat = e.target.value;
                setSelectedCategory(cat);
                setSelectedProduct("");
                setProductName("");
                setBarcodePreview("");
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select category</option>
              <option value="Main Course">Main Course</option>
              {categories.filter(cat => cat !== "Main Course").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Select Product - enabled only after category is selected */}
          <div>
            <label className="text-xs font-bold text-text-primary mb-2 block">Select Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={!selectedCategory}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{selectedCategory ? "Select product" : "Select category first"}</option>
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Label Size Preset */}
          <div>
            <label className="text-xs font-bold text-text-primary mb-2 block">Label Size Preset</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            >
              <option value="2x1">2×1 inches (Small)</option>
              <option value="3x2">3×2 inches (Medium)</option>
              <option value="4x2">4×2 inches (Large)</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-bold text-text-primary mb-2 block">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-border space-y-3">
          <button
            onClick={handleGeneratePreview}
            disabled={!selectedProduct}
            className="w-full py-3 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Barcode size={18} />
            GENERATE PREVIEW
          </button>

          <button
            onClick={handlePrintLabels}
            disabled={!selectedProduct || !barcodePreview}
            className="w-full py-3 bg-primary text-white text-sm font-medium rounded-lg shadow-md shadow-primary-muted hover:bg-primary-hover disabled:grayscale disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            PRINT LABELS
          </button>
        </div>
      </div>
    </div>
  );
}

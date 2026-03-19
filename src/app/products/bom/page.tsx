"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BOMPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [bom, setBom] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bomLoading, setBomLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/raw-materials')
    ]).then(([prodRes, matRes]) => {
      setProducts(prodRes.data);
      setMaterials(matRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setBomLoading(true);
    setIsEditing(false);
    api.get(`/products/${product.id}/bom`)
      .then(res => setBom(res.data))
      .catch((err) => {
        console.error(err);
        setBom([]);
      })
      .finally(() => setBomLoading(false));
  };

  const handleSaveRecipe = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      // Clean up before sending
      const payload = bom.map(item => ({
        raw_material_id: parseInt(item.raw_material_id),
        quantity_per_unit: parseFloat(item.quantity_per_unit),
        unit: item.unit
      }));
      await api.post(`/products/${selectedProduct.id}/bom`, payload);
      setIsEditing(false);
      setSaveResult({ success: true, message: 'Recipe saved successfully!' });
    } catch (err) {
      console.error(err);
      setSaveResult({ success: false, message: 'Failed to save recipe.' });
    } finally {
      setSaving(false);
    }
  };

  const getMaterialName = (id: number) => {
    const mat = materials.find(m => m.id === id);
    return mat ? mat.name : `Material ID: ${id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Recipes (BOM)</h1>
          <p className="text-text-secondary text-sm mt-1">Manage Bill of Materials for each product.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 border border-border rounded-xl bg-surface overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
            <h3 className="font-bold text-text-primary">Select Product</h3>
          </div>
          <div className="p-2 space-y-1 h-[400px] overflow-y-auto">
            {loading ? (
              <p className="text-text-muted text-sm p-4">Loading products...</p>
            ) : (
              products.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProductSelect(p)}
                  className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${selectedProduct?.id === p.id ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-surface-2'}`}
                >
                  {p.name}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-2 border border-border rounded-xl bg-surface overflow-hidden flex flex-col">
          {selectedProduct ? (
            <>
              <div className="p-4 border-b border-border bg-surface-2 flex justify-between items-center">
                <h3 className="font-bold text-text-primary break-all wrap-break-word">{selectedProduct.name} - Recipe</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    Edit Recipe
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        handleProductSelect(selectedProduct); // Reload original
                      }}
                      className="px-3 py-1.5 bg-surface-2 text-text-secondary text-xs font-bold rounded-lg hover:text-text-primary transition-colors flex items-center gap-1"
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      onClick={handleSaveRecipe}
                      disabled={saving}
                      className="px-4 py-1.5 bg-success text-white text-xs font-bold rounded-lg shadow-lg shadow-success/20 hover:bg-success/90 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
              <div className="p-6 flex-1 bg-surface relative">
                {bomLoading ? (
                  <p className="text-text-muted text-sm">Loading recipe...</p>
                ) : isEditing ? (
                  <div className="space-y-4">
                    {bom.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-end p-3 rounded-xl border border-border bg-surface-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Raw Material</label>
                          <select
                            value={item.raw_material_id}
                            onChange={(e) => {
                              const newBom = [...bom];
                              newBom[idx].raw_material_id = e.target.value;
                              const selectedMat = materials.find(m => m.id === parseInt(e.target.value));
                              if (selectedMat) newBom[idx].unit = selectedMat.unit;
                              setBom(newBom);
                            }}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-primary outline-none"
                          >
                            <option value="">Select Material</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32 space-y-1">
                          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Quantity</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.001"
                              value={item.quantity_per_unit}
                              onChange={(e) => {
                                const newBom = [...bom];
                                newBom[idx].quantity_per_unit = e.target.value;
                                setBom(newBom);
                              }}
                              className="w-full bg-surface border border-border rounded-lg pl-3 pr-10 py-2 text-sm text-text-primary focus:border-primary outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted w-6 text-right truncate">
                              {item.unit}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newBom = [...bom];
                            newBom.splice(idx, 1);
                            setBom(newBom);
                          }}
                          className="p-2.5 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => setBom([...bom, { raw_material_id: '', quantity_per_unit: 0, unit: 'unit' }])}
                      className="w-full p-3 border-2 border-dashed border-border rounded-xl text-primary font-bold text-sm hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Ingredient
                    </button>
                  </div>
                ) : bom.length > 0 ? (
                  <div className="space-y-3">
                    {bom.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 rounded-xl border border-border bg-surface-2 hover:border-primary/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {idx + 1}
                          </div>
                          <span className="font-bold text-text-primary">{getMaterialName(item.raw_material_id)}</span>
                        </div>
                        <span className="text-sm font-bold bg-surface border border-border px-3 py-1 rounded-lg text-text-primary">
                          {item.quantity_per_unit} <span className="text-text-muted">{item.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 flex flex-col items-center justify-center h-full opacity-50">
                    <div className="p-4 bg-surface-2 rounded-full mb-4">
                      <Plus size={32} className="text-text-muted" />
                    </div>
                    <p className="text-text-primary font-bold">No recipe defined</p>
                    <p className="text-text-muted text-sm mt-1">Click Edit Recipe to add ingredients.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center bg-surface">
              <div className="opacity-50">
                <p className="text-text-primary font-bold text-lg mb-2">Recipe Viewer</p>
                <p className="text-text-muted text-sm max-w-[200px] mx-auto">Select a product from the list on the left to view or edit its recipe.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Result Modal */}
      {saveResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-surface w-full max-w-sm rounded-2xl shadow-2xl border border-border p-8 text-center space-y-6">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
              saveResult.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}>
              {saveResult.success ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
            </div>

            <div className="space-y-2">
              <h2 className={cn("text-2xl font-bold", saveResult.success ? "text-success" : "text-danger")}>
                {saveResult.success ? "Saved!" : "Failed"}
              </h2>
              <p className="text-text-primary font-medium">{saveResult.message}</p>
            </div>

            <button
              onClick={() => setSaveResult(null)}
              className={cn(
                "w-full py-4 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]",
                saveResult.success
                  ? "bg-success text-white hover:bg-success/90 shadow-success/20"
                  : "bg-danger text-white hover:bg-danger/90 shadow-danger/20"
              )}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

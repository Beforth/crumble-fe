"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, User, Building, Code, Shield, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';

export default function SettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [outletToDelete, setOutletToDelete] = useState<{ id: number; name: string } | null>(null);
  
  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    shop_name: '',
    address: '',
    pincode: '',
    phone: '',
    gst_number: '',
    enable_gst: false,
    gst_rate: 18,
    currency: 'INR',
    date_format: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata'
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Account tab state (profile + password)
  const [accountUser, setAccountUser] = useState<{ email: string; role: string } | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);

  // Aging rule state
  const [agingRule, setAgingRule] = useState({
    interest_0_30: 0,
    interest_31_60: 2,
    interest_60_plus: 5,
    auto_interest: false,
    email_reports: false,
  });
  const [agingRuleSaving, setAgingRuleSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'outlets') {
      fetchOutlets();
    } else if (activeTab === 'general') {
      fetchGeneralSettings();
    } else if (activeTab === 'account') {
      fetchAccountUser();
    } else if (activeTab === 'aging-rule') {
      fetchAgingRule();
    }
  }, [activeTab]);

  const fetchAccountUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const user = res.data;
      setAccountUser(user);
      setAccountEmail(user?.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error fetching account:', err);
    }
  };

  const handleSaveAccount = async () => {
    const wantPasswordChange = newPassword.trim().length > 0;
    if (wantPasswordChange) {
      if (!currentPassword.trim()) {
        alert('Please enter your current password to change password.');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('New password and Confirm password do not match.');
        return;
      }
      if (newPassword.length < 6) {
        alert('New password must be at least 6 characters.');
        return;
      }
    }

    setAccountSaving(true);
    try {
      if (wantPasswordChange) {
        await api.post('/auth/change-password', {
          current_password: currentPassword,
          new_password: newPassword,
        });
      }
      setSuccessMessage('Account settings saved successfully.');
      setShowSuccessModal(true);
      await fetchAccountUser();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Failed to save account settings');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/settings?tab=${tabId}`);
  };

  const fetchGeneralSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await api.get('/settings/general');
      setGeneralSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const getErrorMessage = (error: any, fallback: string) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) return detail[0].msg;
    if (error?.response?.status === 403) return 'Only admins can update settings.';
    return fallback;
  };

  const handleSaveGeneralSettings = async () => {
    try {
      await api.put('/settings/general', generalSettings);
      setSuccessMessage('General settings have been saved successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(getErrorMessage(error, 'Failed to save settings'));
    }
  };

  const handleSaveDeveloperGst = async () => {
    try {
      await api.put('/settings/general?source=developer', generalSettings);
      setSuccessMessage('Developer settings (GST rate) saved successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error saving developer settings:', error);
      alert(getErrorMessage(error, 'Failed to save settings'));
    }
  };

  const fetchAgingRule = async () => {
    try {
      const res = await api.get('/settings/aging-rule');
      setAgingRule(prev => ({ ...prev, ...(res.data || {}) }));
    } catch (err) {
      console.error('Error fetching aging rule:', err);
    }
  };

  const handleSaveAgingRule = async () => {
    setAgingRuleSaving(true);
    try {
      await api.put('/settings/aging-rule', agingRule);
      setSuccessMessage('Aging rule configuration saved successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save aging rules');
    } finally {
      setAgingRuleSaving(false);
    }
  };

  const fetchOutlets = async () => {
    setLoadingOutlets(true);
    try {
      const response = await api.get('/outlets');
      setOutlets(response.data);
    } catch (error) {
      console.error('Error fetching outlets:', error);
    } finally {
      setLoadingOutlets(false);
    }
  };

  const handleDeleteOutlet = async (id: number, name: string) => {
    setOutletToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!outletToDelete) return;
    
    try {
      await api.delete(`/outlets/${outletToDelete.id}`);
      setShowDeleteModal(false);
      setSuccessMessage(`"${outletToDelete.name}" has been deleted successfully.`);
      setOutletToDelete(null);
      setShowSuccessModal(true);
      fetchOutlets(); // Refresh the list
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete outlet');
      setShowDeleteModal(false);
      setOutletToDelete(null);
    }
  };

  const isCashier = user?.role === 'cashier';
  const isInventoryManager = user?.role === 'inventory_manager';

  const tabs = (isCashier || isInventoryManager)
    ? [
        // Cashiers and Inventory Managers only see Account tab
        { id: 'account', label: 'Account', icon: User }
      ]
    : [
        // Admins and other roles see all tabs (outlet access only for superadmin)
        { id: 'general', label: 'General', icon: Settings },
        { id: 'account', label: 'Account', icon: User },
        ...(user?.email === 'superadmin@bakery.com' ? [{ id: 'outlets', label: 'Outlets', icon: Building }] : []),
        // Only show Developer tab for superadmin (email: superadmin@bakery.com)
        ...(user?.email === 'superadmin@bakery.com' ? [{ id: 'developer', label: 'Developer', icon: Code }] : []),
        { id: 'aging-rule', label: 'Aging Rule', icon: Shield }
      ];

  // Set default tab for cashiers and inventory managers
  useEffect(() => {
    if ((isCashier || isInventoryManager) && activeTab !== 'account') {
      setActiveTab('account');
      router.push('/settings?tab=account');
    }
  }, [isCashier, isInventoryManager, activeTab, router]);

  // Outlets tab is only for superadmin; redirect non-superadmin if they land on it
  useEffect(() => {
    if (user?.email !== 'superadmin@bakery.com' && activeTab === 'outlets') {
      setActiveTab('general');
      router.push('/settings?tab=general');
    }
  }, [user?.email, activeTab, router]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary">General Settings</h2>
            {loadingSettings ? (
              <div className="text-center py-8 text-text-secondary">Loading settings...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-lg p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Shop Name</label>
                      <input
                        type="text"
                        value={generalSettings.shop_name}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, shop_name: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="Your Bakery Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Address</label>
                      <textarea
                        value={generalSettings.address}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors resize-none"
                        rows={2}
                        placeholder="Business Address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Pincode</label>
                      <input
                        type="text"
                        value={generalSettings.pincode}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, pincode: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={generalSettings.phone}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-text-primary mb-4">System Preferences</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Currency</label>
                      <select 
                        value={generalSettings.currency}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Date Format</label>
                      <select 
                        value={generalSettings.date_format}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, date_format: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Time Zone</label>
                      <select 
                        value={generalSettings.timezone}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="enableGST"
                        checked={generalSettings.enable_gst}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, enable_gst: e.target.checked })}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary" 
                      />
                      <label htmlFor="enableGST" className="text-sm font-medium text-text-primary">Enable GST Calculation</label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">GST Number</label>
                      <input
                        type="text"
                        value={generalSettings.gst_number}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, gst_number: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="Enter GST Number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'account':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary">Account Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Profile Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Role</label>
                    <input
                      type="text"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-secondary focus:border-primary focus:outline-none transition-colors"
                      value={accountUser?.role ? ((accountUser.role === 'super_admin' || accountUser.role === 'admin') ? 'Superadmin' : accountUser.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) : '—'}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Email Address</label>
                    <input
                      type="email"
                      readOnly
                      aria-readonly="true"
                      className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-text-primary cursor-not-allowed opacity-90"
                      value={accountEmail}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Security</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Current Password</label>
                    <input
                      type="password"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">New Password</label>
                    <input
                      type="password"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Confirm Password</label>
                    <input
                      type="password"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'outlets':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-text-primary">Outlet Management</h2>
              <Link
                href="/settings/outlets/add"
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                Add New Outlet
              </Link>
            </div>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              {loadingOutlets ? (
                <div className="p-8 text-center text-text-secondary">Loading outlets...</div>
              ) : outlets.length === 0 ? (
                <div className="p-8 text-center text-text-secondary">No outlets found. Add your first outlet to get started.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-surface-2 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Outlet Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {outlets.map((outlet) => (
                      <tr key={outlet.id} className="hover:bg-surface-2 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-text-primary">{outlet.name}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{outlet.address || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{outlet.phone || 'N/A'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            outlet.outlet_type === 'warehouse' 
                              ? 'bg-info/10 text-info' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {outlet.outlet_type === 'warehouse' ? 'Warehouse' : 'Outlet'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            outlet.is_active 
                              ? 'bg-success/10 text-success' 
                              : 'bg-danger/10 text-danger'
                          }`}>
                            {outlet.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={`/settings/outlets/edit/${outlet.id}`}
                              className="p-1 text-primary hover:text-primary-hover transition-colors"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </Link>
                            <button 
                              className="p-1 text-danger hover:text-danger/80 transition-colors"
                              title="Delete"
                              onClick={() => handleDeleteOutlet(outlet.id, outlet.name)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      
      case 'developer':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Developer Settings</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <div className="text-red-600 font-bold text-lg">⚠</div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Advanced Controls</h3>
                    <p className="text-xs text-red-700">DANGER: These tools can affect core application behavior. Use with caution.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Taxation Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Default GST Rate (%)</label>
                    <input
                      type="number"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      placeholder="18"
                      min="0"
                      max="100"
                      step="0.01"
                      value={generalSettings.gst_rate}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, gst_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveDeveloperGst}
                      className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      Update GST Rate
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">API Base URL</label>
                    <input
                      type="url"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      placeholder="http://localhost:8000"
                      value="http://localhost:8000"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">API Version</label>
                    <input
                      type="text"
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                      value="v1.0.0"
                      readOnly
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    <label className="text-sm text-text-primary">Enable Debug Mode</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Email and SMTP Configuration</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="enableEmailReports"
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary" 
                    />
                    <label htmlFor="enableEmailReports" className="text-sm font-medium text-text-primary">Enable Daily Email Reports</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Sender Email</label>
                      <input
                        type="email"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="noreply@bakery.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">App Password</label>
                      <input
                        type="password"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">SMTP Port</label>
                      <input
                        type="number"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Recipient Email</label>
                      <input
                        type="email"
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="admin@bakery.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-hover transition-colors">
                      Save Email Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-surface border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Database Information & System Maintenance</h3>
                <div className="space-y-6">
                  {/* Database Information */}
                  <div>
                    <h4 className="text-base font-medium text-text-primary mb-3">Database Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Database Type</label>
                        <input
                          type="text"
                          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-secondary focus:border-primary focus:outline-none transition-colors"
                          value="SQLite"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Database File</label>
                        <input
                          type="text"
                          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-text-secondary focus:border-primary focus:outline-none transition-colors"
                          value="crumble_pos.db"
                          readOnly
                        />
                      </div>
                    </div>
                    <button className="px-6 py-2.5 bg-warning text-white text-sm font-medium rounded-lg hover:bg-warning/90 transition-colors">
                      Backup Database
                    </button>
                  </div>
                  
                  <hr className="border-border" />
                  
                  {/* System Maintenance */}
                  <div>
                    <h4 className="text-base font-medium text-text-primary mb-2">System Maintenance</h4>
                    <p className="text-sm text-text-secondary mb-3">Reset the application database. This will delete all recorded data both locally and remotely.</p>
                    <button className="px-6 py-2.5 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors">
                      RESET APPLICATION DATABASE
                    </button>
                  </div>
                  
                  <hr className="border-border" />
                  
                  {/* Emergency Data Recovery */}
                  <div>
                    <h4 className="text-base font-medium text-text-primary mb-2">Emergency Data Recovery</h4>
                    <p className="text-sm text-text-secondary mb-3">Use this if your inventory items are not showing up but exist in the database.</p>
                    <button className="px-6 py-2.5 bg-info text-white text-sm font-medium rounded-lg hover:bg-info/90 transition-colors">
                      RECOVER DELETED ITEMS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'aging-rule':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-text-primary">Aging Rule Configuration</h2>
            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4">Credit Aging Rules</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">0-30 Days</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="0"
                        value={agingRule.interest_0_30}
                        onChange={(e) => setAgingRule({ ...agingRule, interest_0_30: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="text-sm text-text-secondary">% Interest</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">31-60 Days</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="2"
                        value={agingRule.interest_31_60}
                        onChange={(e) => setAgingRule({ ...agingRule, interest_31_60: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="text-sm text-text-secondary">% Interest</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">60+ Days</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-text-primary focus:border-primary focus:outline-none transition-colors"
                        placeholder="5"
                        value={agingRule.interest_60_plus}
                        onChange={(e) => setAgingRule({ ...agingRule, interest_60_plus: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="text-sm text-text-secondary">% Interest</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      checked={agingRule.auto_interest}
                      onChange={(e) => setAgingRule({ ...agingRule, auto_interest: e.target.checked })}
                    />
                    <label className="text-sm text-text-primary">Enable automatic interest calculation</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      checked={agingRule.email_reports}
                      onChange={(e) => setAgingRule({ ...agingRule, email_reports: e.target.checked })}
                    />
                    <label className="text-sm text-text-primary">Send aging reports via email</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
        <p className="text-text-secondary text-sm">Manage your system preferences and configurations</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-border">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`}
            >
              <IconComponent size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {renderTabContent()}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center mt-8 gap-3">
        {(activeTab === 'general' || activeTab === 'account' || activeTab === 'aging-rule') && (
          <button 
            onClick={
              activeTab === 'general'
                ? handleSaveGeneralSettings
                : activeTab === 'account'
                  ? handleSaveAccount
                  : activeTab === 'aging-rule'
                    ? handleSaveAgingRule
                    : undefined
            }
            disabled={(activeTab === 'account' && accountSaving) || (activeTab === 'aging-rule' && agingRuleSaving)}
            className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeTab === 'account' && accountSaving ? 'Saving...' : activeTab === 'aging-rule' && agingRuleSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setOutletToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Outlet"
        message={`Are you sure you want to delete "${outletToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={activeTab === 'outlets' ? "Outlet Deleted" : "Settings Saved"}
        message={successMessage}
      />
    </div>
  );
}

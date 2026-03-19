"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DataTable from '@/components/tables/DataTable';
import { cn } from '@/lib/utils';
import { UserPlus, Shield, Edit, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { useAuth } from '@/hooks/useAuth';

export default function UsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [userToToggle, setUserToToggle] = useState<{ id: number; name: string; is_active: boolean } | null>(null);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);

  // When current user is admin, hide super_admin and superadmin@bakery.com from the table
  const visibleUsers = useMemo(() => {
    if (currentUser?.role !== 'admin') return users;
    return users.filter(
      (u) => u.role !== 'super_admin' && u.email !== 'superadmin@bakery.com'
    );
  }, [users, currentUser?.role]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = (user: any) => {
    setUserToToggle({ id: user.id, name: user.name, is_active: user.is_active });
    setShowConfirmModal(true);
  };

  const confirmToggleStatus = async () => {
    if (!userToToggle) return;

    try {
      await api.patch(`/users/${userToToggle.id}`, {
        is_active: !userToToggle.is_active
      });
      setShowConfirmModal(false);
      const action = userToToggle.is_active ? 'disabled' : 'enabled';
      setSuccessTitle('User Status Updated');
      setSuccessMessage(`User "${userToToggle.name}" has been ${action} successfully.`);
      setUserToToggle(null);
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert(error.response?.data?.detail || 'Failed to update user status');
      setShowConfirmModal(false);
      setUserToToggle(null);
    }
  };

  const handleDelete = (user: any) => {
    setUserToDelete({ id: user.id, name: user.name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await api.delete(`/users/${userToDelete.id}`);
      setShowDeleteModal(false);
      setSuccessTitle('User Deleted');
      setSuccessMessage(`User "${userToDelete.name}" has been deleted successfully.`);
      setUserToDelete(null);
      setShowSuccessModal(true);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.detail || 'Failed to delete user');
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Staff Management</h1>
          <p className="text-text-secondary text-sm mt-1">Create and manage access for staff members.</p>
        </div>
        <button
          onClick={() => router.push('/settings/users/add')}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover shadow-lg shadow-primary-muted transition-all active:scale-95">
          <UserPlus size={18} />
          Add New Staff
        </button>
      </div>

      <DataTable
        columns={['Name', 'Role', 'Outlet', 'Status', 'Actions']}
        data={visibleUsers}
        loading={loading}
        renderRow={(u) => (
          <>
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-primary">
                  {u.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-text-primary">{u.name}</span>
                  <span className="text-xs text-text-muted">{u.email}</span>
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2 px-2 py-1 bg-surface-2 rounded-lg border border-border w-fit">
                <Shield size={12} className="text-primary" />
                <span className="text-[10px] font-bold text-text-primary uppercase tracking-widest">{u.role.replace('_', ' ')}</span>
              </div>
            </td>
            <td className="px-6 py-4">
              <span className="text-sm text-text-secondary font-medium line-clamp-2">
                {u.outlets && u.outlets.length > 0
                  ? u.outlets.map((o: any) => o.name).join(', ')
                  : 'No Outlet'}
              </span>
            </td>
            <td className="px-6 py-4">
              <span className={cn(
                "px-2 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest",
                u.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              )}>
                {u.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => router.push(`/settings/users/edit/${u.id}`)}
                  className="p-1 text-primary hover:text-primary-hover transition-colors"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleToggleStatus(u)}
                  className={cn(
                    "p-1 transition-colors",
                    u.is_active 
                      ? "text-danger hover:text-danger/80" 
                      : "text-success hover:text-success/80"
                  )}
                  title={u.is_active ? "Disable" : "Enable"}
                >
                  {u.is_active ? <Ban size={18} /> : <CheckCircle size={18} />}
                </button>
                <button 
                  onClick={() => handleDelete(u)}
                  className="p-1 text-danger hover:text-danger/80 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </td>
          </>
        )}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setUserToToggle(null);
        }}
        onConfirm={confirmToggleStatus}
        title={userToToggle?.is_active ? "Disable User" : "Enable User"}
        message={
          userToToggle?.is_active
            ? `Are you sure you want to disable "${userToToggle?.name}"? They will not be able to login.`
            : `Are you sure you want to enable "${userToToggle?.name}"? They will be able to login again.`
        }
        confirmText={userToToggle?.is_active ? "Disable" : "Enable"}
        cancelText="Cancel"
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User"
        message={
          userToDelete
            ? `Are you sure you want to delete "${userToDelete.name}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successTitle}
        message={successMessage}
      />
    </div>
  );
}

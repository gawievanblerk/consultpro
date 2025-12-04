import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { PlusIcon, MagnifyingGlassIcon, UserIcon, TrashIcon } from '@heroicons/react/24/outline';

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
    is_decision_maker: false,
    notes: ''
  });

  useEffect(() => {
    fetchContacts();
    fetchClients();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await api.get('/api/contacts');
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients');
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        client_id: contact.client_id || '',
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        job_title: contact.job_title || '',
        department: contact.department || '',
        is_decision_maker: contact.is_decision_maker || false,
        notes: contact.notes || ''
      });
    } else {
      setEditingContact(null);
      setFormData({
        client_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        department: '',
        is_decision_maker: false,
        notes: ''
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingContact(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingContact) {
        await api.put(`/api/contacts/${editingContact.id}`, formData);
      } else {
        await api.post('/api/contacts', formData);
      }
      fetchContacts();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save contact:', error);
      alert('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/api/contacts/${id}`);
      fetchContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert('Failed to delete contact');
    }
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    contact.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">Manage client contacts</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Contact
        </button>
      </div>

      <div className="card">
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Job Title</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => handleOpenModal(contact)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-accent-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-accent-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                        {contact.is_decision_maker && (
                          <span className="text-xs text-accent-600">Decision Maker</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{contact.client_name || '-'}</td>
                  <td>{contact.job_title || '-'}</td>
                  <td>{contact.email || '-'}</td>
                  <td>{contact.phone || '-'}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">No contacts found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingContact ? 'Edit Contact' : 'Add Contact'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Client *</label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_decision_maker}
                  onChange={(e) => setFormData({ ...formData, is_decision_maker: e.target.checked })}
                  className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Decision Maker</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingContact ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Contacts;

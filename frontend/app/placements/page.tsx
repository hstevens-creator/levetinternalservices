'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Placement {
  id: number;
  placement_ref: string;
  format: string;
  client_id?: number;
  client_name?: string;
  screen_id?: number;
  campaign_name: string;
  location?: string;
  start_date: string;
  end_date: string;
  status: string;
  artwork_url?: string;
  price?: number;
  notes?: string;
}

interface Client {
  id: number;
  name: string;
}

interface Screen {
  id: number;
  name: string;
  location: string;
}

export default function PlacementsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loadingPlacements, setLoadingPlacements] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [formData, setFormData] = useState({
    placement_ref: '',
    format: 'MiniBoard',
    client_id: '',
    screen_id: '',
    campaign_name: '',
    location: '',
    start_date: '',
    end_date: '',
    artwork_url: '',
    price: '',
    notes: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchPlacements();
      fetchClients();
      fetchScreens();
    }
  }, [user, statusFilter]);

  const fetchPlacements = async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await api.get(`/placements${params}`);
      setPlacements(response.data);
    } catch (err) {
      console.error('Error fetching placements:', err);
    } finally {
      setLoadingPlacements(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchScreens = async () => {
    try {
      const response = await api.get('/screens');
      setScreens(response.data);
    } catch (err) {
      console.error('Error fetching screens:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        placement_ref: formData.placement_ref,
        format: formData.format,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        screen_id: formData.format === 'DigiBoard' && formData.screen_id ? parseInt(formData.screen_id) : null,
        campaign_name: formData.campaign_name,
        location: formData.location || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        artwork_url: formData.artwork_url || null,
        price: formData.price ? parseFloat(formData.price) : null,
        notes: formData.notes || null,
      };

      if (editingPlacement) {
        await api.put(`/placements/${editingPlacement.id}`, submitData);
      } else {
        await api.post('/placements', submitData);
      }
      setShowModal(false);
      setEditingPlacement(null);
      setFormData({
        placement_ref: '',
        format: 'MiniBoard',
        client_id: '',
        screen_id: '',
        campaign_name: '',
        location: '',
        start_date: '',
        end_date: '',
        artwork_url: '',
        price: '',
        notes: '',
      });
      fetchPlacements();
    } catch (err) {
      console.error('Error saving placement:', err);
      alert('Failed to save placement. Please check all required fields.');
    }
  };

  const handleEdit = (placement: Placement) => {
    setEditingPlacement(placement);
    setFormData({
      placement_ref: placement.placement_ref,
      format: placement.format,
      client_id: placement.client_id ? placement.client_id.toString() : '',
      screen_id: placement.screen_id ? placement.screen_id.toString() : '',
      campaign_name: placement.campaign_name,
      location: placement.location || '',
      start_date: placement.start_date.split('T')[0],
      end_date: placement.end_date.split('T')[0],
      artwork_url: placement.artwork_url || '',
      price: placement.price ? placement.price.toString() : '',
      notes: placement.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this placement?')) {
      try {
        await api.delete(`/placements/${id}`);
        fetchPlacements();
      } catch (err) {
        console.error('Error deleting placement:', err);
        alert('Failed to delete placement.');
      }
    }
  };

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  const canEdit = user.role === 'admin' || user.role === 'staff';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Placements</h1>
            <div className="flex space-x-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingPlacement(null);
                    setFormData({
                      placement_ref: '',
                      format: 'MiniBoard',
                      client_id: '',
                      screen_id: '',
                      campaign_name: '',
                      location: '',
                      start_date: '',
                      end_date: '',
                      artwork_url: '',
                      price: '',
                      notes: '',
                    });
                    setShowModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Placement
                </button>
              )}
            </div>
          </div>

          {loadingPlacements ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    {canEdit && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {placements.map((placement) => (
                    <tr key={placement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {placement.placement_ref}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {placement.format}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {placement.client_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {placement.campaign_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(placement.start_date).toLocaleDateString()} - {new Date(placement.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(placement.status)}`}>
                          {placement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        £{placement.price ? parseFloat(placement.price).toFixed(2) : '0.00'}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(placement)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            {user.role === 'admin' && (
                              <button
                                onClick={() => handleDelete(placement.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {placements.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                        No placements found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)}></div>
            <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all max-w-2xl w-full z-20">
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {editingPlacement ? 'Edit Placement' : 'Add Placement'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Placement Reference *
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.placement_ref}
                        onChange={(e) => setFormData({ ...formData, placement_ref: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Format *
                      </label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.format}
                        onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                      >
                        <option value="MiniBoard">MiniBoard</option>
                        <option value="DigiBoard">DigiBoard</option>
                        <option value="Vending">Vending</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Client
                      </label>
                      <select
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      >
                        <option value="">Select Client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {formData.format === 'DigiBoard' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Screen
                        </label>
                        <select
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={formData.screen_id}
                          onChange={(e) => setFormData({ ...formData, screen_id: e.target.value })}
                        >
                          <option value="">Select Screen</option>
                          {screens.map((screen) => (
                            <option key={screen.id} value={screen.id}>
                              {screen.name} ({screen.location || 'No location'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className={formData.format === 'DigiBoard' ? '' : 'col-span-1'}>
                      <label className="block text-sm font-medium text-gray-700">
                        Campaign Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.campaign_name}
                        onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Location
                      </label>
                      <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Price (£)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Artwork URL
                      </label>
                      <input
                        type="url"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.artwork_url}
                        onChange={(e) => setFormData({ ...formData, artwork_url: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingPlacement ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

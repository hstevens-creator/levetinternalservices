'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { Monitor, Circle } from 'lucide-react';

interface Screen {
  id: number;
  name: string;
  location: string;
  online: boolean;
  last_seen: string;
  player_key: string;
}

export default function ScreensPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loadingScreens, setLoadingScreens] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchScreens();
      const interval = setInterval(fetchScreens, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchScreens = async () => {
    try {
      const response = await api.get('/screens');
      setScreens(response.data);
    } catch (err) {
      console.error('Error fetching screens:', err);
    } finally {
      setLoadingScreens(false);
    }
  };

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Digital Screens</h1>
          </div>

          {loadingScreens ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {screens.map((screen) => (
                <div key={screen.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Monitor className="h-8 w-8 text-gray-400 mr-3" />
                        <h3 className="text-lg font-medium text-gray-900">{screen.name}</h3>
                      </div>
                      <Circle
                        className={`h-4 w-4 ${screen.online ? 'fill-green-500 text-green-500' : 'fill-gray-300 text-gray-300'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Location:</span> {screen.location || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Status:</span>{' '}
                        <span className={screen.online ? 'text-green-600' : 'text-gray-600'}>
                          {screen.online ? 'Online' : 'Offline'}
                        </span>
                      </p>
                      {screen.last_seen && (
                        <p className="text-sm text-gray-500">
                          <span className="font-medium">Last Seen:</span>{' '}
                          {new Date(screen.last_seen).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {screens.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500">
                  No screens found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

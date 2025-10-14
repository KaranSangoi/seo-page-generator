'use client';

/**
 * SearchClients Component
 * Provides search/filter functionality for the client list
 */

import { useState, useMemo } from 'react';
import ClientCard from './ClientCard';

interface Client {
  id: string;
  clientName: string;
  clientWebsite: string;
  totalPages: number;
  lastGeneration: Date | null;
}

interface SearchClientsProps {
  clients: Client[];
}

export default function SearchClients({ clients }: SearchClientsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }

    const query = searchQuery.toLowerCase();
    return clients.filter((client) => {
      return (
        client.clientName.toLowerCase().includes(query) ||
        client.clientWebsite.toLowerCase().includes(query)
      );
    });
  }, [clients, searchQuery]);

  return (
    <>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients by name or website..."
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results Summary */}
      {searchQuery && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {filteredClients.length === 0 ? (
            <p>No clients found matching "{searchQuery}"</p>
          ) : (
            <p>
              Found {filteredClients.length} {filteredClients.length === 1 ? 'client' : 'clients'}
              {filteredClients.length !== clients.length && ` out of ${clients.length}`}
            </p>
          )}
        </div>
      )}

      {/* Clients Grid */}
      <div className="mt-6">
        {filteredClients.length === 0 ? (
          /* No Results */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No clients found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No clients match your search for "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* Clients Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

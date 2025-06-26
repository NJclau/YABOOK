import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhotoSearch = ({ currentSchool }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!currentSchool || !searchQuery.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      const response = await axios.get(`${API}/schools/${currentSchool.id}/photos/search`, {
        params: {
          q: searchQuery,
          count: 50,
          offset: 0
        }
      });
      
      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error('Error searching photos:', error);
      alert('Error searching photos: ' + (error.response?.data?.detail || error.message));
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  if (!currentSchool) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Please select a school from the dashboard to search photos.</p>
      </div>
    );
  }

  const exampleQueries = [
    'graduation ceremony',
    'sports event',
    'classroom activities',
    'outdoor activities',
    'group photos',
    'individual portraits'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Photo Search</h1>
        <p className="text-gray-600">
          Search photos in {currentSchool.name} using AI-powered natural language queries
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., 'graduation ceremony', 'students playing basketball', 'group photos'"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              {hasSearched && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Example Queries */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Example searches:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => setSearchQuery(query)}
                className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 border border-blue-200"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Search Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-500 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-900 mb-1">AI-Powered Search</h3>
            <p className="text-sm text-blue-800">
              Our AI can understand natural language queries and find photos based on content, context, and metadata. 
              You can search for activities, objects, people, emotions, and even abstract concepts.
            </p>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Searching photos with AI...</p>
          </div>
        </div>
      )}

      {hasSearched && !loading && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              Search Results for "{searchQuery}" ({searchResults.length} photos)
            </h2>
          </div>
          
          {searchResults.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
              <p className="text-gray-500">Try adjusting your search query or make sure photos are synced to PhotoPrism</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map((photo, index) => (
                  <div key={photo.uuid || index} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="aspect-w-16 aspect-h-12 bg-gray-100">
                      <div className="flex items-center justify-center p-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        {photo.title || photo.filename || 'Untitled'}
                      </h3>
                      
                      {photo.filename && (
                        <p className="text-xs text-gray-500 mb-2">{photo.filename}</p>
                      )}
                      
                      {photo.keywords && photo.keywords.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">Keywords:</p>
                          <div className="flex flex-wrap gap-1">
                            {photo.keywords.slice(0, 3).map((keyword, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                {keyword}
                              </span>
                            ))}
                            {photo.keywords.length > 3 && (
                              <span className="text-xs text-gray-400">+{photo.keywords.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {photo.faces && photo.faces.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-500 mb-1">Faces detected:</p>
                          <div className="flex flex-wrap gap-1">
                            {photo.faces.slice(0, 2).map((face, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                {face.name || 'Unknown'} ({Math.round(face.confidence * 100)}%)
                              </span>
                            ))}
                            {photo.faces.length > 2 && (
                              <span className="text-xs text-gray-400">+{photo.faces.length - 2} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        {photo.created_at && (
                          <p>Date: {new Date(photo.created_at).toLocaleDateString()}</p>
                        )}
                        {photo.uuid && (
                          <p className="truncate">UUID: {photo.uuid}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoSearch;
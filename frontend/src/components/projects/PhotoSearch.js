import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Search, Filter, X, Calendar, Tag, Users, MapPin } from 'lucide-react';

const PhotoSearch = ({ onSearch, onReset, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    tags: '',
    consent_status: '',
    date_from: '',
    date_to: '',
    sort_by: 'uploaded_at',
    sort_order: 'desc'
  });

  const handleSearch = () => {
    const searchParams = {
      search: searchTerm || undefined,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      )
    };
    onSearch(searchParams);
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilters({
      tags: '',
      consent_status: '',
      date_from: '',
      date_to: '',
      sort_by: 'uploaded_at',
      sort_order: 'desc'
    });
    onReset();
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Basic Search */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search photos by name, tags, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="shrink-0"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button onClick={handleSearch} disabled={isLoading}>
            Search
          </Button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tags Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  Tags
                </label>
                <Input
                  placeholder="Enter tags (comma-separated)"
                  value={filters.tags}
                  onChange={(e) => updateFilter('tags', e.target.value)}
                />
              </div>

              {/* Consent Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Consent Status
                </label>
                <select
                  value={filters.consent_status}
                  onChange={(e) => updateFilter('consent_status', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  From Date
                </label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => updateFilter('date_from', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  To Date
                </label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => updateFilter('date_to', e.target.value)}
                />
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Sort By</label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => updateFilter('sort_by', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="uploaded_at">Upload Date</option>
                  <option value="original_name">Name</option>
                  <option value="file_size">File Size</option>
                  <option value="consent_status">Consent Status</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Sort Order</label>
                <select
                  value={filters.sort_order}
                  onChange={(e) => updateFilter('sort_order', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleReset}>
                <X className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
              <Button onClick={handleSearch} disabled={isLoading}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoSearch;
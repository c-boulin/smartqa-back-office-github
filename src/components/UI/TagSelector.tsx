import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Tag } from '../../services/tagsApi';

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  // onCreateTag: (label: string) => Promise<Tag>;
  disabled?: boolean;
  placeholder?: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  availableTags,
  selectedTags,
  onTagsChange,
  disabled = false,
  placeholder = 'Search or create tags...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter available tags based on search term and exclude already selected
  const filteredTags = (availableTags || []).filter(tag => 
    tag.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedTags.some(selected => selected.id === tag.id)
  );

  // Check if search term would create a new tag
  const canCreateNew = searchTerm.trim() && 
    !(availableTags || []).some(tag => tag.label.toLowerCase() === searchTerm.toLowerCase()) &&
    !selectedTags.some(tag => tag.label.toLowerCase() === searchTerm.toLowerCase());

  const handleTagSelect = (tag: Tag) => {
    onTagsChange([...selectedTags, tag]);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleTagRemove = (tagToRemove: Tag) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagToRemove.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canCreateNew) {
        // Create a temporary tag that will be created on form submission
        const tempTag: Tag = {
          id: `temp-${Date.now()}`,
          label: searchTerm.trim()
        };
        onTagsChange([...selectedTags, tempTag]);
        setSearchTerm('');
        setIsOpen(false);
      } else if (filteredTags.length > 0) {
        handleTagSelect(filteredTags[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400"
            >
              <TagIcon className="w-3 h-3 mr-1" />
              {tag.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleTagRemove(tag)}
                  className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <TagIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {/* Search input inside dropdown */}
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tags..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
              autoFocus
            />
          </div>

          {/* Existing tags */}
          {filteredTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagSelect(tag)}
              className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-colors flex items-center"
            >
              <TagIcon className="w-4 h-4 mr-2 text-gray-400" />
              {tag.label}
            </button>
          ))}


          {/* Create new tag option */}
          {canCreateNew && (
            <button
              type="button"
              onClick={() => {
                // Create a temporary tag that will be created on form submission
                const tempTag: Tag = {
                  id: `temp-${Date.now()}`,
                  label: searchTerm.trim()
                };
                onTagsChange([...selectedTags, tempTag]);
                setSearchTerm('');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-cyan-400 hover:bg-slate-700 transition-colors flex items-center border-t border-slate-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add "{searchTerm}" (will be created on save)
            </button>
          )}

          {/* No results */}
          {filteredTags.length === 0 && !canCreateNew && (
            <div className="px-4 py-2 text-gray-400 text-sm">
              {searchTerm ? 'No tags found' : 'Start typing to search tags'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagSelector;
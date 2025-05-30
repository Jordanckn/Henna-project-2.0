import React, { useState, useEffect } from 'react';
import { getPhotos, deletePhoto } from '../lib/supabase';
import { X, Trash2, RefreshCw, ImageOff, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface Photo {
  id: string;
  image_url: string;
  comment: string;
  created_at: string;
}

interface AdminGalleryProps {
  onClose: () => void;
}

const AdminGallery: React.FC<AdminGalleryProps> = ({ onClose }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedPhoto) {
        if (event.key === 'ArrowLeft') {
          handlePrevious();
        } else if (event.key === 'ArrowRight') {
          handleNext();
        } else if (event.key === 'Escape') {
          setSelectedPhoto(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIndex, photos]);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getPhotos();
      
      if (!data || !Array.isArray(data)) {
        throw new Error('No data received or invalid format');
      }
      
      const validatedPhotos = data.filter(photo => 
        photo && 
        typeof photo.id === 'string' && 
        typeof photo.image_url === 'string'
      );
      
      setPhotos(validatedPhotos);
      setImageLoadErrors({});
    } catch (error: any) {
      console.error('Error fetching photos:', error);
      setError(error.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (photo: Photo, index: number) => {
    setSelectedIndex(index);
    setSelectedPhoto(photo);
  };

  const handlePrevious = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(photos[newIndex]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < photos.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(photos[newIndex]);
    }
  };

  const handleImageError = (id: string) => {
    setImageLoadErrors(prev => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  };

  const handleDeletePhoto = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    
    try {
      setIsDeleting(true);
      await deletePhoto(id);
      setPhotos(photos.filter(photo => photo.id !== id));
      
      if (selectedPhoto && selectedPhoto.id === id) {
        setSelectedPhoto(null);
      }
      
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      setError(`Failed to delete photo: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date unavailable';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date unavailable';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">
      <div className="bg-white p-4 flex justify-between items-center">
        <h2 className="text-xl font-medium text-amber-800">Admin Gallery</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={fetchPhotos}
            className="p-2 rounded-full hover:bg-gray-100 text-amber-600"
            disabled={loading}
            aria-label="Refresh gallery"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close gallery"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600 mb-4"></div>
            <p className="text-amber-200">Loading photos...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center flex-col p-4">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchPhotos}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg flex items-center"
          >
            <RefreshCw size={18} className="mr-2" /> Try Again
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          {selectedPhoto ? (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
                aria-label="Close fullscreen view"
              >
                <X size={24} />
              </button>
              
              {selectedIndex > 0 && (
                <button 
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={32} />
                </button>
              )}
              
              {selectedIndex < photos.length - 1 && (
                <button 
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight size={32} />
                </button>
              )}
              
              <div className="max-w-4xl w-full flex flex-col items-center">
                {imageLoadErrors[selectedPhoto.id] ? (
                  <div className="flex flex-col items-center justify-center h-[50vh] w-full bg-gray-800 rounded-lg">
                    <ImageOff size={64} className="text-gray-400 mb-4" />
                    <p className="text-gray-300">Image could not be loaded</p>
                  </div>
                ) : (
                  <img 
                    src={selectedPhoto.image_url} 
                    alt={selectedPhoto.comment || "Wedding photo"} 
                    className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
                    onError={() => handleImageError(selectedPhoto.id)}
                  />
                )}
                
                <div className="mt-4 bg-white/10 backdrop-blur-md p-4 rounded-xl text-white max-w-2xl w-full">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm opacity-80 mb-2">
                        {selectedPhoto.created_at ? formatDate(selectedPhoto.created_at) : 'Date unavailable'}
                      </p>
                      {selectedPhoto.comment && (
                        <p className="text-white">{selectedPhoto.comment}</p>
                      )}
                    </div>
                    
                    <div>
                      {deleteConfirm === selectedPhoto.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 bg-gray-600 text-white text-xs rounded"
                            disabled={isDeleting}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(selectedPhoto.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded flex items-center"
                            disabled={isDeleting}
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(selectedPhoto.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-full text-white"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          
          {photos.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-amber-400" />
              </div>
              <p className="text-amber-200 text-lg mb-2">No photos have been shared yet.</p>
              <p className="text-amber-400 mt-2">The gallery is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div 
                  key={photo.id} 
                  className="relative gallery-card bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all"
                >
                  <div 
                    className="aspect-square relative cursor-pointer"
                    onClick={() => handlePhotoClick(photo, index)}
                  >
                    {imageLoadErrors[photo.id] ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700">
                        <ImageOff size={32} className="text-gray-500" />
                      </div>
                    ) : (
                      <img 
                        src={photo.image_url} 
                        alt={photo.comment || "Wedding photo"}
                        className="w-full h-full object-cover transition-all"
                        loading="lazy"
                        onError={() => handleImageError(photo.id)}
                      />
                    )}
                  </div>
                  
                  <div className="p-3 flex justify-between items-center">
                    <p className="text-xs text-amber-300 truncate flex-1">
                      {photo.created_at ? formatDate(photo.created_at).split(',')[0] : 'Date unavailable'}
                    </p>
                    
                    {deleteConfirm === photo.id ? (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1 bg-gray-700 text-white text-xs rounded"
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="p-1 bg-red-600 text-white text-xs rounded"
                          disabled={isDeleting}
                        >
                          {isDeleting ? '...' : 'Delete'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(photo.id)}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-full text-white"
                        aria-label="Delete photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGallery;

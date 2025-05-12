import React, { useRef, useState } from 'react';
import { X, Upload, ImageOff, Check, Trash2, Plus } from 'lucide-react';
import { uploadPhotoViaEdgeFunction } from '../lib/supabase';

interface UploadComponentProps {
  onClose: () => void;
  onPhotoUploaded: (count: number) => void;
}

interface FileWithPreview {
  file: File;
  preview: string;
  comment: string;
  id: string;
}

const UploadComponent: React.FC<UploadComponentProps> = ({ onClose, onPhotoUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File size limits
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
  const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 30MB total
  const MAX_FILES = 3;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Check if adding these files would exceed the maximum number
    if (selectedFiles.length + files.length > MAX_FILES) {
      setError(`You can only upload up to ${MAX_FILES} files at once.`);
      return;
    }
    
    // Calculate total size including existing files
    let totalSize = selectedFiles.reduce((sum, item) => sum + item.file.size, 0);
    
    const newFiles: FileWithPreview[] = [];
    const errors: string[] = [];
    
    Array.from(files).forEach(file => {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file.`);
        return;
      }
      
      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds the 10MB limit.`);
        return;
      }
      
      // Check if adding this file would exceed total size limit
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`Adding ${file.name} would exceed the 30MB total limit.`);
        return;
      }
      
      totalSize += file.size;
      
      // Create a unique ID for this file
      const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          newFiles.push({
            file,
            preview: event.target.result,
            comment: '',
            id
          });
          
          // Only update state after all files are processed
          if (newFiles.length === Array.from(files).length - errors.length) {
            setSelectedFiles(prev => [...prev, ...newFiles]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (errors.length > 0) {
      setError(errors.join(' '));
    } else {
      setError(null);
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const updateComment = (id: string, comment: string) => {
    setSelectedFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, comment } : file
      )
    );
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image to upload.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // Upload each file
      const uploadPromises = selectedFiles.map(async ({ file, comment }) => {
        try {
          await uploadPhotoViaEdgeFunction(file, comment);
          return true;
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          return false;
        }
      });
      
      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(Boolean).length;
      
      if (successCount === 0) {
        throw new Error('Failed to upload any photos. Please try again.');
      } else if (successCount < selectedFiles.length) {
        setError(`Only ${successCount} out of ${selectedFiles.length} photos were uploaded successfully.`);
      }
      
      onPhotoUploaded(successCount);
      onClose();
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      setError(error.message || 'Failed to upload photos. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="bg-amber-500 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-medium">Upload Your Pictures</h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-amber-600 transition-colors"
            aria-label="Close upload"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">
              Select up to 3 photos to share (max 10MB each, 30MB total)
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            
            {selectedFiles.length < MAX_FILES && (
              <button
                onClick={triggerFileInput}
                className="w-full py-3 border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Plus size={20} className="mr-2" />
                Add Photos
              </button>
            )}
          </div>
          
          {selectedFiles.length > 0 ? (
            <div className="space-y-4">
              {selectedFiles.map((fileItem) => (
                <div key={fileItem.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex">
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100">
                      <img 
                        src={fileItem.preview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '';
                          target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                          const icon = document.createElement('div');
                          icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"></path><line x1="13.5" y1="13.5" x2="6" y2="21"></line><path d="M21 15l-5-5M5 3l14 14"></path></svg>';
                          target.parentElement?.appendChild(icon);
                        }}
                      />
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-[200px]">
                            {fileItem.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(fileItem.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button 
                          onClick={() => removeFile(fileItem.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          aria-label="Remove file"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <textarea
                        value={fileItem.comment}
                        onChange={(e) => updateComment(fileItem.id, e.target.value)}
                        placeholder="Add a comment (optional)"
                        className="w-full mt-2 p-2 border border-gray-200 rounded text-sm h-16 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <Upload size={24} className="text-amber-500" />
              </div>
              <p className="text-gray-500 mb-2">No photos selected yet</p>
              <p className="text-amber-600 text-sm">Click "Add Photos" to select images from your device</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={isUploading || selectedFiles.length === 0}
              className={`flex-1 py-3 bg-gradient-to-r from-amber-500 to-rose-400 text-white rounded-lg font-medium hover:from-amber-600 hover:to-rose-500 transition-colors flex items-center justify-center ${
                (isUploading || selectedFiles.length === 0) ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <span className="animate-pulse">Uploading...</span>
              ) : (
                <>
                  <Check size={18} className="mr-1" /> Upload {selectedFiles.length} Photo{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadComponent;

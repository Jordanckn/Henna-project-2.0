import { useState } from 'react';
import { Camera, Image, Menu, X, Upload } from 'lucide-react';
import CameraComponent from './components/Camera';
import AdminLogin from './components/AdminLogin';
import AdminGallery from './components/AdminGallery';
import PublicGallery from './components/PublicGallery';
import UploadComponent from './components/Upload';
import './index.css';

function App() {
  const [showCamera, setShowCamera] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminGallery, setShowAdminGallery] = useState(false);
  const [showPublicGallery, setShowPublicGallery] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handlePhotoTaken = (count: number = 1) => {
    setPhotoCount(prev => prev + count);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-10 shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-medium text-amber-800">
            <span className="text-rose-500">Meitav</span> & <span className="text-amber-600">Jordan</span>
          </h1>
          
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="text-amber-600 hover:text-amber-800 transition-colors text-sm font-medium px-4 py-1.5 rounded-full border border-amber-200 hover:border-amber-400 bg-white/50 hover:bg-white/80"
            >
              Admin
            </button>
          </div>
          
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-amber-700 hover:text-amber-900"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md shadow-lg py-4 px-6 absolute w-full">
            <div className="flex flex-col space-y-3">
              <button
                onClick={() => {
                  setShowAdminLogin(true);
                  setMobileMenuOpen(false);
                }}
                className="text-amber-600 hover:text-amber-800 transition-colors text-sm font-medium py-2"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-200 to-rose-200 flex items-center justify-center shadow-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-amber-800">H</h2>
            </div>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-amber-800 mb-4 decorative-line relative inline-block">
            Welcome to our Henna's App 📸          </h2>
          
          <p className="text-lg text-rose-500 font-medium mb-4">June 19, 2025</p>
          
          <div className="w-32 h-0.5 bg-gradient-to-r from-amber-300 via-rose-300 to-amber-300 mx-auto my-6 rounded-full"></div>
          
          <p className="text-stone-700 text-lg leading-relaxed">
            Capture your memories from our special day! Take a photo and it will be added to our collection.
          </p>
          
          {photoCount > 0 && (
            <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 animate-float shadow-sm">
              <p className="text-emerald-700 font-medium">
                Thank you for adding {photoCount} photo{photoCount !== 1 ? 's' : ''}!
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-16 flex-wrap justify-center">
          <button
            onClick={() => setShowCamera(true)}
            className="btn-primary flex items-center justify-center text-lg"
          >
            <Camera className="mr-3" size={24} />
            Take a Photo
          </button>
          
          <button
            onClick={() => setShowUpload(true)}
            className="btn-secondary flex items-center justify-center text-lg bg-amber-500 hover:bg-amber-600"
          >
            <Upload className="mr-3" size={24} />
            Upload your Pictures
          </button>
          
          <button
            onClick={() => setShowPublicGallery(true)}
            className="btn-secondary flex items-center justify-center text-lg"
          >
            <Image className="mr-3" size={24} />
            View Gallery
          </button>
        </div>
        
        <div className="w-full max-w-4xl mx-auto bg-white/60 backdrop-blur-md rounded-2xl shadow-md p-8 mb-12 border border-amber-100">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-1 bg-gradient-to-r from-amber-300 to-rose-300 rounded-full"></div>
          </div>
          <h3 className="text-2xl font-bold text-amber-800 mb-4 text-center">Welcome to our Franco-Yemenite 2.0 universe</h3>
          <p className="text-stone-900 text-center leading-relaxed">
            Thank you for your presence, it warms our hearts. Share all your photos and view them in real time.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-amber-600 to-rose-500 text-white py-8 text-center">
        <div className="container mx-auto px-4">
          <p className="font-medium text-lg mb-2">Meitav & Jordan's Henna Celebration </p>
          <p className="text-white/80 text-sm">June 19, 2025</p>
          <div className="w-16 h-0.5 bg-white/30 mx-auto my-4 rounded-full"></div>
          <p className="text-white/70 text-xs">Made with love</p>
        </div>
      </footer>

      {/* Camera Component */}
      {showCamera && (
        <CameraComponent 
          onClose={() => setShowCamera(false)} 
          onPhotoTaken={handlePhotoTaken}
        />
      )}

      {/* Upload Component */}
      {showUpload && (
        <UploadComponent 
          onClose={() => setShowUpload(false)} 
          onPhotoUploaded={handlePhotoTaken}
        />
      )}

      {/* Public Gallery */}
      {showPublicGallery && (
        <PublicGallery 
          onClose={() => setShowPublicGallery(false)}
        />
      )}

      {/* Admin Login */}
      {showAdminLogin && (
        <AdminLogin 
          onLogin={() => {
            setShowAdminLogin(false);
            setShowAdminGallery(true);
          }}
          onClose={() => setShowAdminLogin(false)}
        />
      )}

      {/* Admin Gallery */}
      {showAdminGallery && (
        <AdminGallery 
          onClose={() => setShowAdminGallery(false)}
        />
      )}
    </div>
  );
}

export default App;

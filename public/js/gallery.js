/**
 * Gallery JavaScript
 * Handles photo upload, management, and lightbox viewer
 */

let selectedFiles = [];
let uploadQueue = [];
let lightboxOpen = false;

/**
 * Initialize gallery functionality
 */
function initializeGallery() {
  setupFileInput();
  setupDragAndDrop();
  setupPhotoActions();
  setupLightbox();
  loadGalleryPhotos();
}

/**
 * Setup file input handler
 */
function setupFileInput() {
  const fileInput = document.getElementById('photo-upload-input');
  const uploadBtn = document.getElementById('upload-photo-btn');
  
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
      handleFileSelect(e.target.files);
    });
  }
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
  const dropZone = document.getElementById('photo-drop-zone');
  
  if (!dropZone) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('border-blue-500', 'bg-blue-50');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    }, false);
  });
  
  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, false);
}

/**
 * Handle file selection
 */
function handleFileSelect(files) {
  if (!files || files.length === 0) return;
  
  const validFiles = Array.from(files).filter(file => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast(`${file.name} is not an image file`, 'error');
      return false;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`${file.name} is too large (max 10MB)`, 'error');
      return false;
    }
    
    return true;
  });
  
  if (validFiles.length === 0) return;
  
  selectedFiles = [...selectedFiles, ...validFiles];
  displayFilePreview();
}

/**
 * Display file preview before upload
 */
function displayFilePreview() {
  const previewContainer = document.getElementById('photo-preview-container');
  
  if (!previewContainer) return;
  
  previewContainer.innerHTML = '';
  previewContainer.classList.remove('hidden');
  
  selectedFiles.forEach((file, index) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const preview = document.createElement('div');
      preview.className = 'relative group';
      preview.innerHTML = `
        <img src="${e.target.result}" alt="Preview" class="w-full h-32 object-cover rounded-lg">
        <button class="remove-preview absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-index="${index}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <p class="text-xs text-gray-600 mt-1 truncate">${file.name}</p>
        <p class="text-xs text-gray-500">${(file.size / 1024).toFixed(1)} KB</p>
      `;
      
      previewContainer.appendChild(preview);
      
      // Setup remove button
      preview.querySelector('.remove-preview').addEventListener('click', () => {
        removeFileFromSelection(index);
      });
    };
    
    reader.readAsDataURL(file);
  });
  
  // Show upload button
  const uploadAllBtn = document.getElementById('upload-all-btn');
  const cancelUploadBtn = document.getElementById('cancel-upload-btn');
  
  if (uploadAllBtn) {
    uploadAllBtn.classList.remove('hidden');
    uploadAllBtn.onclick = () => uploadAllPhotos();
  }
  
  if (cancelUploadBtn) {
    cancelUploadBtn.classList.remove('hidden');
    cancelUploadBtn.onclick = () => cancelUpload();
  }
}

/**
 * Remove file from selection
 */
function removeFileFromSelection(index) {
  selectedFiles.splice(index, 1);
  
  if (selectedFiles.length === 0) {
    cancelUpload();
  } else {
    displayFilePreview();
  }
}

/**
 * Cancel upload
 */
function cancelUpload() {
  selectedFiles = [];
  const previewContainer = document.getElementById('photo-preview-container');
  const uploadAllBtn = document.getElementById('upload-all-btn');
  const cancelUploadBtn = document.getElementById('cancel-upload-btn');
  
  if (previewContainer) {
    previewContainer.innerHTML = '';
    previewContainer.classList.add('hidden');
  }
  
  if (uploadAllBtn) uploadAllBtn.classList.add('hidden');
  if (cancelUploadBtn) cancelUploadBtn.classList.add('hidden');
}

/**
 * Upload all selected photos
 */
async function uploadAllPhotos() {
  if (selectedFiles.length === 0) return;
  
  const uploadProgressContainer = document.getElementById('upload-progress-container');
  const progressBar = document.getElementById('upload-progress-bar');
  const progressText = document.getElementById('upload-progress-text');
  
  if (uploadProgressContainer) {
    uploadProgressContainer.classList.remove('hidden');
  }
  
  let uploaded = 0;
  const total = selectedFiles.length;
  
  for (const file of selectedFiles) {
    try {
      await uploadSinglePhoto(file);
      uploaded++;
      
      if (progressBar) {
        const percentage = (uploaded / total) * 100;
        progressBar.style.width = `${percentage}%`;
      }
      
      if (progressText) {
        progressText.textContent = `Uploading ${uploaded} of ${total}`;
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      showToast(`Failed to upload ${file.name}: ${error.message}`, 'error');
    }
  }
  
  if (uploadProgressContainer) {
    uploadProgressContainer.classList.add('hidden');
  }
  
  showToast(`Successfully uploaded ${uploaded} of ${total} photos`, 'success');
  
  cancelUpload();
  loadGalleryPhotos();
}

/**
 * Upload single photo
 */
async function uploadSinglePhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  
  const response = await fetch('/api/model/photos/upload', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin'
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Upload failed');
  }
  
  return response.json();
}

/**
 * Load gallery photos
 */
async function loadGalleryPhotos() {
  try {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;
    
    showLoadingOverlay();
    
    const data = await apiGet('/api/model/photos');
    
    if (!data.photos || data.photos.length === 0) {
      galleryContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <p class="text-gray-500 text-lg">No photos yet. Upload your first photo!</p>
        </div>
      `;
      hideLoadingOverlay();
      return;
    }
    
    galleryContainer.innerHTML = data.photos.map(photo => `
      <div class="photo-item relative group cursor-pointer" data-photo-id="${photo.id}">
        <img src="${photo.url}" alt="${photo.title || 'Photo'}" 
             class="w-full h-64 object-cover rounded-lg transition-transform group-hover:scale-105"
             onclick="openLightbox(${photo.id})">
        
        ${photo.isCover ? '<span class="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">Cover</span>' : ''}
        
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div class="flex gap-2">
            ${!photo.isCover ? `<button onclick="setCoverPhoto(${photo.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg" title="Set as cover">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
              </svg>
            </button>` : ''}
            <button onclick="deletePhoto(${photo.id})" class="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg" title="Delete">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="mt-2">
          <p class="font-medium text-gray-900 truncate">${photo.title || 'Untitled'}</p>
          <p class="text-sm text-gray-500">${formatDate(photo.createdAt, 'short')}</p>
        </div>
      </div>
    `).join('');
    
    hideLoadingOverlay();
  } catch (error) {
    hideLoadingOverlay();
    console.error('Failed to load gallery:', error);
    showToast('Failed to load gallery: ' + error.message, 'error');
  }
}

/**
 * Set cover photo
 */
async function setCoverPhoto(photoId) {
  try {
    showLoadingOverlay();
    await apiPut(`/api/model/photos/${photoId}/cover`);
    hideLoadingOverlay();
    
    showToast('Cover photo updated successfully', 'success');
    loadGalleryPhotos();
  } catch (error) {
    hideLoadingOverlay();
    showToast('Failed to set cover photo: ' + error.message, 'error');
  }
}

/**
 * Delete photo
 */
async function deletePhoto(photoId) {
  const confirmed = await confirmDialog('Are you sure you want to delete this photo? This action cannot be undone.');
  if (!confirmed) return;
  
  try {
    showLoadingOverlay();
    await apiDelete(`/api/model/photos/${photoId}`);
    hideLoadingOverlay();
    
    showToast('Photo deleted successfully', 'success');
    loadGalleryPhotos();
  } catch (error) {
    hideLoadingOverlay();
    showToast('Failed to delete photo: ' + error.message, 'error');
  }
}

/**
 * Setup photo action handlers
 */
function setupPhotoActions() {
  // Actions are now handled by inline onclick handlers for simplicity
  // This could be refactored to use event delegation if needed
}

/**
 * Setup lightbox viewer
 */
function setupLightbox() {
  const lightbox = document.getElementById('lightbox');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => navigateLightbox(-1));
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => navigateLightbox(1));
  }
  
  // Close on background click
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightboxOpen) return;
    
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });
}

/**
 * Open lightbox with photo
 */
async function openLightbox(photoId) {
  try {
    const data = await apiGet(`/api/model/photos/${photoId}`);
    const photo = data.photo;
    
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    
    if (!lightbox || !lightboxImg) return;
    
    lightboxImg.src = photo.url;
    if (lightboxTitle) {
      lightboxTitle.textContent = photo.title || 'Untitled';
    }
    
    lightbox.dataset.currentPhotoId = photoId;
    lightbox.classList.remove('hidden');
    lightboxOpen = true;
    
    document.body.style.overflow = 'hidden';
  } catch (error) {
    console.error('Failed to open lightbox:', error);
    showToast('Failed to load photo', 'error');
  }
}

/**
 * Close lightbox
 */
function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.classList.add('hidden');
    lightboxOpen = false;
    document.body.style.overflow = '';
  }
}

/**
 * Navigate lightbox (prev/next)
 */
function navigateLightbox(direction) {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  
  const currentPhotoId = parseInt(lightbox.dataset.currentPhotoId);
  const photoItems = Array.from(document.querySelectorAll('.photo-item'));
  const currentIndex = photoItems.findIndex(item => 
    parseInt(item.dataset.photoId) === currentPhotoId
  );
  
  if (currentIndex === -1) return;
  
  let newIndex = currentIndex + direction;
  if (newIndex < 0) newIndex = photoItems.length - 1;
  if (newIndex >= photoItems.length) newIndex = 0;
  
  const newPhotoId = parseInt(photoItems[newIndex].dataset.photoId);
  openLightbox(newPhotoId);
}

// Make functions globally accessible for inline onclick handlers
window.setCoverPhoto = setCoverPhoto;
window.deletePhoto = deletePhoto;
window.openLightbox = openLightbox;

// Initialize gallery on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeGallery();
});

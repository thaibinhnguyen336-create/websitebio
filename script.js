// Global state management
const state = {
    isGenerating: false,
    generatedImages: [],
    currentPrompt: '',
    apiKey: 'sk-demo', // WhomeAI API key
    baseUrl: 'https://api.whomeai.com/v1/images/generations'
};

// DOM Elements
const elements = {
    prompt: document.getElementById('prompt'),
    generateBtn: document.getElementById('generateBtn'),
    model: document.getElementById('model'),
    size: document.getElementById('size'),
    quantity: document.getElementById('quantity'),
    seed: document.getElementById('seed'),
    loadingSection: document.getElementById('loadingSection'),
    errorSection: document.getElementById('errorSection'),
    errorMessage: document.getElementById('errorMessage'),
    retryBtn: document.getElementById('retryBtn'),
    gallerySection: document.getElementById('gallerySection'),
    imageGallery: document.getElementById('imageGallery'),
    imageModal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    modalPrompt: document.getElementById('modalPrompt'),
    modalClose: document.querySelector('.modal-close'),
    downloadBtn: document.getElementById('downloadBtn')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadSavedSettings();
});

// Initialize app
function initializeApp() {
    console.log('🚀 Initializing WebsiteBio AI Image Generator');
    showGalleryPlaceholder();
}

// Setup event listeners
function setupEventListeners() {
    // Generate button
    elements.generateBtn.addEventListener('click', handleGenerate);
    
    // Enter key in prompt textarea
    elements.prompt.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerate();
        }
    });
    
    // Retry button
    elements.retryBtn.addEventListener('click', handleRetry);
    
    // Modal close
    elements.modalClose.addEventListener('click', closeModal);
    elements.imageModal.addEventListener('click', function(e) {
        if (e.target === elements.imageModal) {
            closeModal();
        }
    });
    
    // Download button
    elements.downloadBtn.addEventListener('click', handleDownload);
    
    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // Auto-save settings on change
    ['model', 'size', 'quantity', 'seed'].forEach(id => {
        const element = document.getElementById(id);
        element.addEventListener('change', saveSettings);
    });
}

// Handle image generation
async function handleGenerate() {
    const prompt = elements.prompt.value.trim();
    
    if (!prompt) {
        showError('Please enter a description for your image.');
        return;
    }
    
    if (prompt.length < 5) {
        showError('Please provide a more detailed description (at least 5 characters).');
        return;
    }
    
    state.currentPrompt = prompt;
    state.isGenerating = true;
    
    // Update UI
    updateGenerateButton(true);
    hideError();
    hideGallery();
    showLoading();
    
    try {
        const images = await generateImages(prompt);
        displayImages(images);
        hideLoading();
        state.isGenerating = false;
        updateGenerateButton(false);
        
        // Save successful prompt
        saveRecentPrompt(prompt);
        
    } catch (error) {
        console.error('Generation failed:', error);
        hideLoading();
        state.isGenerating = false;
        updateGenerateButton(false);
        showError(error.message || 'Failed to generate images. Please try again.');
    }
}

// Generate images via API
async function generateImages(prompt) {
    const settings = {
        model: elements.model.value,
        size: elements.size.value,
        n: parseInt(elements.quantity.value),
        seed: elements.seed.value ? parseInt(elements.seed.value) : undefined
    };
    
    console.log('🎨 Generating images with settings:', settings);
    
    const requestBody = {
        prompt: prompt,
        model: settings.model,
        size: settings.size,
        n: settings.n
    };
    
    // Add seed if provided
    if (settings.seed) {
        requestBody.seed = settings.seed;
    }
    
    const response = await fetch(state.baseUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${state.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`API Error: ${errorMessage}`);
    }
    
    const data = await response.json();
    
    if (!data.images || !Array.isArray(data.images)) {
        throw new Error('Invalid response from API: No images returned');
    }
    
    // Process images
    const processedImages = data.images.map((image, index) => ({
        id: `img_${Date.now()}_${index}`,
        url: `data:image/png;base64,${image.base64}`,
        revisedPrompt: image.revised_prompt || prompt,
        prompt: prompt,
        model: settings.model,
        size: settings.size,
        seed: settings.seed
    }));
    
    console.log('✅ Generated', processedImages.length, 'images');
    return processedImages;
}

// Display images in gallery
function displayImages(images) {
    state.generatedImages = images;
    
    // Clear existing gallery
    elements.imageGallery.innerHTML = '';
    
    // Create image cards
    images.forEach(image => {
        const imageCard = createImageCard(image);
        elements.imageGallery.appendChild(imageCard);
    });
    
    // Show gallery
    showGallery();
    
    // Scroll to gallery
    setTimeout(() => {
        elements.gallerySection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Create image card element
function createImageCard(image) {
    const card = document.createElement('div');
    card.className = 'image-card fade-in';
    
    card.innerHTML = `
        <div class="image-container">
            <img src="${image.url}" alt="Generated Image" loading="lazy">
        </div>
        <div class="image-info">
            <p class="revised-prompt">${image.revisedPrompt}</p>
            <div class="image-actions">
                <button class="action-btn view-btn" data-image-id="${image.id}">
                    <i class="fas fa-eye"></i>
                    View Full Size
                </button>
                <button class="action-btn download-btn-small" data-image-id="${image.id}">
                    <i class="fas fa-download"></i>
                    Download
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const viewBtn = card.querySelector('.view-btn');
    const downloadBtnSmall = card.querySelector('.download-btn-small');
    
    viewBtn.addEventListener('click', () => openModal(image));
    downloadBtnSmall.addEventListener('click', () => downloadImage(image));
    
    return card;
}

// Open image modal
function openModal(image) {
    elements.modalImage.src = image.url;
    elements.modalPrompt.textContent = image.revisedPrompt;
    elements.imageModal.style.display = 'flex';
    elements.downloadBtn.dataset.imageId = image.id;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    elements.imageModal.style.display = 'none';
    elements.modalImage.src = '';
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
}

// Handle image download
function handleDownload() {
    const imageId = elements.downloadBtn.dataset.imageId;
    const image = state.generatedImages.find(img => img.id === imageId);
    
    if (image) {
        downloadImage(image);
    }
}

// Download individual image
function downloadImage(image) {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `websitebio-generated-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success feedback
    showToast('Image downloaded successfully!', 'success');
}

// Show loading state
function showLoading() {
    elements.loadingSection.style.display = 'block';
    elements.loadingSection.className = 'loading-section slide-up';
}

// Hide loading state
function hideLoading() {
    elements.loadingSection.style.display = 'none';
}

// Show error
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorSection.style.display = 'block';
    elements.errorSection.className = 'error-section slide-up';
    
    // Scroll to error
    setTimeout(() => {
        elements.errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Hide error
function hideError() {
    elements.errorSection.style.display = 'none';
}

// Handle retry
function handleRetry() {
    hideError();
    handleGenerate();
}

// Update generate button state
function updateGenerateButton(generating) {
    if (generating) {
        elements.generateBtn.disabled = true;
        elements.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        elements.generateBtn.style.opacity = '0.7';
    } else {
        elements.generateBtn.disabled = false;
        elements.generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Images';
        elements.generateBtn.style.opacity = '1';
    }
}

// Show gallery
function showGallery() {
    elements.gallerySection.style.display = 'block';
    elements.gallerySection.className = 'gallery-section fade-in';
}

// Hide gallery
function hideGallery() {
    elements.gallerySection.style.display = 'none';
}

// Show gallery placeholder
function showGalleryPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = 'gallery-placeholder fade-in';
    placeholder.innerHTML = `
        <i class="fas fa-image"></i>
        <p>Your generated images will appear here</p>
    `;
    
    elements.imageGallery.innerHTML = '';
    elements.imageGallery.appendChild(placeholder);
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        model: elements.model.value,
        size: elements.size.value,
        quantity: elements.quantity.value,
        seed: elements.seed.value
    };
    
    localStorage.setItem('websitebio-ai-settings', JSON.stringify(settings));
}

// Load settings from localStorage
function loadSavedSettings() {
    try {
        const saved = localStorage.getItem('websitebio-ai-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            if (settings.model) elements.model.value = settings.model;
            if (settings.size) elements.size.value = settings.size;
            if (settings.quantity) elements.quantity.value = settings.quantity;
            if (settings.seed) elements.seed.value = settings.seed;
            
            console.log('✅ Loaded saved settings');
        }
    } catch (error) {
        console.warn('Failed to load saved settings:', error);
    }
}

// Save recent prompt
function saveRecentPrompt(prompt) {
    const key = 'websitebio-recent-prompts';
    let prompts = [];
    
    try {
        const saved = localStorage.getItem(key);
        if (saved) {
            prompts = JSON.parse(saved);
        }
        
        // Add new prompt at beginning
        prompts.unshift({
            prompt: prompt,
            timestamp: Date.now()
        });
        
        // Keep only last 10 prompts
        prompts = prompts.slice(0, 10);
        
        localStorage.setItem(key, JSON.stringify(prompts));
    } catch (error) {
        console.warn('Failed to save prompt:', error);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add toast styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        font-size: 0.9rem;
    `;
    
    const toastContent = toast.querySelector('.toast-content');
    toastContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateImages,
        displayImages,
        saveSettings,
        loadSavedSettings
    };
}

// Console welcome message
console.log(`
🎨 WebsiteBio AI Image Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Features:
  • WhomeAI API Integration
  • Multiple Models & Sizes
  • Responsive Design
  • Image Gallery
  • Download Functionality
  
🚀 Ready to generate amazing images!
`);

// Handle network status
window.addEventListener('online', function() {
    showToast('Connection restored!', 'success');
});

window.addEventListener('offline', function() {
    showToast('No internet connection. Please check your network.', 'error');
});

// Performance monitoring
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log(`⚡ Page loaded in ${Math.round(perfData.loadEventEnd - perfData.loadEventStart)}ms`);
        }, 0);
    });
}
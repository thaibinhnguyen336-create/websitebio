# WebsiteBio AI Image Generator

A modern, responsive web application for generating AI-powered images using the WhomeAI API. This project provides a complete user interface for creating, customizing, and downloading AI-generated images with various models and settings.

## ✨ Features

### 🎨 Image Generation
- **Prompt-based generation**: Enter detailed descriptions to generate custom images
- **Multiple AI models**: Choose from nano-banana, IMAGEN_4, and nano-banana-r2i models
- **Flexible image sizes**: Support for landscape (1792×1024), portrait (1024×1792), and square (1024×1024) formats
- **Batch generation**: Generate 1-4 images simultaneously
- **Reproducible results**: Optional seed parameter for consistent outputs

### 🎛️ User Interface
- **Modern design**: Clean, intuitive interface with smooth animations
- **Responsive layout**: Optimized for desktop, tablet, and mobile devices
- **Real-time feedback**: Loading states, progress indicators, and error handling
- **Gallery view**: Display generated images in an elegant grid layout
- **Modal preview**: Full-size image viewing with detailed information

### 💾 Functionality
- **Download images**: Save generated images directly to your device
- **Settings persistence**: Your preferences are automatically saved
- **Error recovery**: Retry failed generations with error handling
- **Keyboard shortcuts**: Ctrl+Enter to generate, Escape to close modals
- **Offline detection**: Network status monitoring with user notifications

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for API calls to WhomeAI)
- WhomeAI API access (using demo key: `sk-demo`)

### Installation

1. **Clone or download** the project files to your local machine
2. **Open `index.html`** in your web browser
3. **Start generating** images immediately!

```bash
# If you have the files locally, simply open:
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

### Project Structure
```
/
├── index.html              # Main HTML structure
├── styles.css              # Responsive CSS styling
├── script.js               # JavaScript functionality and API integration
├── config.js               # Configuration and environment handling
├── vercel.json             # Vercel deployment configuration
├── DEPLOYMENT.md           # Deployment guide and instructions
├── api/
│   └── generateImages.js   # Serverless function for API requests
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions deployment workflow
└── README.md               # This documentation file
```

## 🎯 Usage Guide

### Basic Usage

1. **Enter a prompt**: Describe the image you want to generate in the text area
2. **Configure settings**: Choose your preferred model, size, and quantity
3. **Generate**: Click "Generate Images" or press Ctrl+Enter
4. **View results**: See your generated images in the gallery
5. **Download**: Click on any image to view full size and download

### Advanced Settings

#### Model Selection
- **nano-banana**: Fast generation, good for quick iterations
- **IMAGEN_4**: High-quality output, best for final results
- **nano-banana-r2i**: Specialized model for specific use cases

#### Image Sizes
- **1792×1024**: Landscape format, ideal for wide scenes
- **1024×1792**: Portrait format, perfect for vertical compositions
- **1024×1024**: Square format, social media friendly

#### Batch Generation
Generate multiple variations at once by selecting 1-4 images. This is useful for:
- Comparing different styles
- Getting more options to choose from
- Creating image sets with consistent themes

#### Seed Parameter
Use the optional seed for reproducible results:
- Same prompt + same seed = identical images
- Different seed = new variation
- Leave empty for random generation

### Keyboard Shortcuts
- **Ctrl + Enter**: Generate images
- **Escape**: Close modal/preview
- **Tab**: Navigate between form elements

## 🔧 API Integration

### WhomeAI API Configuration

The application is configured to use the WhomeAI API with the following settings:

- **Endpoint**: `https://api.whomeai.com/v1/images/generations`
- **Authentication**: Bearer token with `sk-demo` key
- **Method**: POST
- **Content-Type**: application/json

### Request Format

```json
{
  "prompt": "Your image description",
  "model": "nano-banana",
  "size": "1792x1024",
  "n": 2,
  "seed": 12345
}
```

### Response Format

The API returns base64-encoded images with revised prompts:

```json
{
  "images": [
    {
      "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
      "revised_prompt": "Enhanced version of your prompt"
    }
  ]
}
```

## 🛠️ Customization

### Styling
The application uses modern CSS with:
- **CSS Grid** for responsive layouts
- **CSS Animations** for smooth transitions
- **CSS Custom Properties** for easy theming
- **Mobile-first** responsive design

### JavaScript Architecture
The code is organized with:
- **State management** for app-wide data
- **Event-driven** architecture
- **Error handling** with user feedback
- **Local storage** for persistence

### Modifying the Interface

1. **Colors and themes**: Edit CSS custom properties in `styles.css`
2. **Layout**: Modify grid templates and responsive breakpoints
3. **API settings**: Update configuration in `script.js`
4. **Models and sizes**: Add new options in the HTML select elements

## 🌐 Browser Compatibility

- ✅ **Chrome** 80+
- ✅ **Firefox** 75+
- ✅ **Safari** 13+
- ✅ **Edge** 80+

### Required Features
- CSS Grid and Flexbox
- ES6+ JavaScript (async/await, modules)
- Fetch API
- Local Storage
- Base64 image handling

## 📱 Mobile Experience

The interface is fully responsive with:
- **Touch-friendly** buttons and controls
- **Optimized layouts** for small screens
- **Gesture support** for image viewing
- **Performance optimization** for mobile networks

## 🔒 Security & Privacy

- **No data collection**: Prompts and images are not stored on servers
- **Client-side processing**: All generation happens in your browser
- **API communication**: Direct connection to WhomeAI servers
- **Local storage**: Settings saved only in your browser

## 🐛 Troubleshooting

### Common Issues

**Images not generating**
- Check internet connection
- Verify API service status
- Ensure prompt is descriptive enough
- Try refreshing the page

**Poor image quality**
- Use more detailed prompts
- Try different models
- Increase prompt specificity

**Download not working**
- Check browser's download permissions
- Try right-click → "Save image as"
- Clear browser cache if needed

**Interface not responsive**
- Try different browser
- Update to latest browser version
- Check JavaScript is enabled

### Error Messages

- **"Please enter a description"**: Add text to the prompt field
- **"API Error"**: Check API service status or network connection
- **"Invalid response"**: Try regenerating with simpler prompt

## 🌐 Deployment

### Deploy to Vercel (Recommended)

This project is configured for seamless deployment on Vercel with automatic CI/CD:

1. **Connect GitHub Repository**
   ```bash
   # Push code to GitHub
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Click "Add New Project" and select your GitHub repository
   - Vercel will auto-detect the configuration from `vercel.json`

3. **Set Environment Variables**
   - In Vercel Dashboard → Project Settings → Environment Variables
   - Add: `WHOMEAI_API_KEY = sk-demo` (or your API key)

4. **Automatic Deployments**
   - Push to `main` → Production deployment
   - Create pull request → Preview deployment
   - Automatic SSL/HTTPS setup

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

### Local Development
1. **Serve files**: Use any local server (Live Server, Python's `http.server`, etc.)
   ```bash
   # Using Python
   python3 -m http.server 8000
   
   # Using Node.js (with http-server)
   npx http-server
   ```
2. **Debug mode**: Open browser developer tools for detailed error messages
3. **Testing**: Test on multiple browsers and devices

### Adding Features
The codebase is modular and extensible:
- **New models**: Add to the model select dropdown
- **Custom themes**: Modify CSS custom properties
- **Additional settings**: Extend the settings panel
- **Image effects**: Add post-processing filters

### Environment Variables
Configure via `.env` file for local development:
```bash
# .env (for local development)
WHOMEAI_API_KEY=sk-demo
VITE_WHOMEAI_API_ENDPOINT=https://api.whomeai.com/v1/images/generations
```

Use `.env.example` as a template.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **WhomeAI** for providing the image generation API
- **Font Awesome** for the icon set
- **Modern CSS** features for responsive design
- **Web standards** community for browser APIs

---

**Happy image generating!** 🎨✨

For questions or support, please refer to the WhomeAI documentation or create an issue in this project's repository.
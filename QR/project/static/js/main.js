document.addEventListener('DOMContentLoaded', function () {
    // Theme Toggle with Persistence
const themeToggle = document.getElementById('theme-toggle');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// Initialize theme from localStorage or system preference
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : systemDark;
    
    document.body.classList.toggle('dark-mode', isDark);
    if (themeToggle) {
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
    }
}

// Setup toggle functionality
if (themeToggle) {
    themeToggle.addEventListener('click', function() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        const icon = themeToggle.querySelector('.material-icons');
        icon.textContent = isDark ? 'brightness_7' : 'brightness_4';
    });
}

// Apply theme on page load
initializeTheme();

    // Elements
    const urlInput = document.getElementById('url-input');
    const pasteBtn = document.getElementById('paste-btn');
    const pasteIcon = pasteBtn.querySelector('.material-icons');
    const pasteText = pasteBtn.querySelector('.text');
    const historyBtn = document.getElementById('history-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const cameraPlaceholder = document.getElementById('camera-placeholder');
    const qrVideo = document.getElementById('qr-video');
    const qrShadedRegion = document.getElementById('qr-shaded-region');

    let html5QrCode;
    let isCameraActive = false;

    // Initialize QR Scanner
    function initQRScanner() {
        if (isCameraActive) return;
        
        cameraPlaceholder.innerHTML = `
            <span class="material-icons spin">camera</span>
            <p>Starting camera...</p>
        `;
        
        html5QrCode = new Html5Qrcode("qr-video");
        const config = {
    fps: 10,
    qrbox: function(viewfinderWidth, viewfinderHeight) {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxSize = Math.floor(minEdge * 0.7); // 70% of the smaller dimension
        return { width: boxSize, height: boxSize };
    },
    rememberLastUsedCamera: true
};


        Html5Qrcode.getCameras().then(cameras => {
            if (cameras && cameras.length) {
                const cameraId = cameras[0].id;
                html5QrCode.start(
                    cameraId,
                    config,
                    decodedText => {
                        sendToBackend(decodedText);
                        stopCamera();
                    },
                    errorMessage => onCameraError(errorMessage)
                ).then(() => {
                    isCameraActive = true;
                    cameraPlaceholder.style.display = 'none';
                    qrVideo.style.display = 'block';
                    if (qrShadedRegion) qrShadedRegion.style.display = 'block';
                });
            } else {
                throw "No cameras found";
            }
        }).catch(err => {
            console.error("Camera error:", err);
            cameraPlaceholder.innerHTML = `
                <span class="material-icons">error</span>
                <p>Camera not available</p>
            `;
            cameraPlaceholder.style.color = 'red';
        });
    }

    function stopCamera() {
        if (html5QrCode && isCameraActive) {
            html5QrCode.stop().then(() => {
                isCameraActive = false;
                qrVideo.style.display = 'none';
                cameraPlaceholder.style.display = 'flex';
                cameraPlaceholder.innerHTML = `
                    <span class="material-icons">photo_camera</span>
                    <p class="placeholder-text">Tap to start camera</p>
                `;
                if (qrShadedRegion) qrShadedRegion.style.display = 'none';
            }).catch(err => {
                console.error("Error stopping camera:", err);
            });
        }
    }

    function onCameraError(errorMessage) {
        console.error("QR Scanner error:", errorMessage);
        // Don't stop camera for minor errors
    }

    // Send URL to Flask backend
    // Updated sendToBackend function
function sendToBackend(url) {
    const loader = document.createElement('div');
    loader.className = 'fullscreen-loader';
    loader.innerHTML = '<div class="spinner"></div><p>Processing...</p>';
    document.body.appendChild(loader);
    if (!url) return;
    
    console.log("Sending URL to backend:", url);
    
    // Create a hidden form to submit to Flask
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/process_qr';  // Must match Flask route
    form.style.display = 'none';
    
    // Add URL as form data
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'qr_url';
    input.value = url;
    form.appendChild(input);
    
    document.body.appendChild(form);
    form.submit();  // This will navigate to Flask
    
    // Clean up
    setTimeout(() => document.body.removeChild(form), 100);
    
    // Stop camera if active
    if (isCameraActive) stopCamera();

    setTimeout(() => {
        if (document.body.contains(loader)) {
            document.body.removeChild(loader);
        }
    }, 1500);
}

    // Input Events
    urlInput.addEventListener('input', function () {
        const hasText = urlInput.value.trim() !== '';
        pasteBtn.classList.toggle('has-text', hasText);
        pasteIcon.textContent = hasText ? 'arrow_forward' : 'content_paste';
        pasteText.textContent = hasText ? 'Go' : 'Paste';
    });

    pasteBtn.addEventListener('click', async function () {
        if (pasteBtn.classList.contains('has-text')) {
            const url = urlInput.value.trim();
            if (url) {
                sendToBackend(url);
                urlInput.value = ''; // Clear input after sending
                urlInput.dispatchEvent(new Event('input')); // Update button state
            }
        } else {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    urlInput.value = text;
                    urlInput.dispatchEvent(new Event('input'));
                }
            } catch (err) {
                console.error('Clipboard error:', err);
                alert('Could not access clipboard. Paste manually.');
            }
        }
    });

    // Image Upload
    uploadBtn.addEventListener('click', function () {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<span class="material-icons spin">hourglass_top</span> Processing...';

            try {
                // Create a temporary container for scanning
                const tempContainer = document.createElement('div');
                tempContainer.id = 'temp-qr-container';
                document.body.appendChild(tempContainer);
                
                const html5QrCodeFile = new Html5Qrcode(tempContainer.id);
                const decodedText = await html5QrCodeFile.scanFile(file, true);
                
                if (decodedText) {
                    await sendToBackend(decodedText);
                } else {
                    throw new Error("No QR code found in the image");
                }
            } catch (err) {
                console.error("Scan failed:", err);
                alert(err.message.includes("No QR code found") 
                    ? "No QR code found in the image" 
                    : "Scan error: " + err.message);
            } finally {
                // Clean up
                const tempContainer = document.getElementById('temp-qr-container');
                if (tempContainer) tempContainer.remove();
                
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<span class="material-icons">image</span> Upload QR Image';
            }
        };
        
        fileInput.click();
    });

    // History Button
    historyBtn.addEventListener('click', () => alert('History feature coming soon'));

    // Camera Initialization
    cameraPlaceholder.addEventListener('click', function() {
        if (isCameraActive) {
            stopCamera();
        } else {
            initQRScanner();
        }
    });

    // Initialize camera on page load if placeholder is visible
    if (getComputedStyle(cameraPlaceholder).display !== 'none') {
        initQRScanner();
    }
});

// Apply saved theme on load

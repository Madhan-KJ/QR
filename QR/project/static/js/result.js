// Apply dark mode on page load (for pages without toggle button)
// For non-toggle pages
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
});

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', function() {
    // Back Button
    document.getElementById('back-btn').addEventListener('click', function() {
        window.location.href = '/main';
    });

    // Copy Button
    document.getElementById('copy-btn').addEventListener('click', function() {
        const urlText = document.getElementById('url-text').textContent;
        navigator.clipboard.writeText(urlText).then(function() {
            const copyBtn = document.getElementById('copy-btn');
            const icon = copyBtn.querySelector('.material-icons');
            icon.textContent = 'done';
            setTimeout(function() {
                icon.textContent = 'content_copy';
            }, 2000);
        }).catch(function(err) {
            console.error('Could not copy text: ', err);
        });
    });

    // Action Button
    document.getElementById('action-btn').addEventListener('click', function() {
        const url = document.getElementById('url-text').textContent;
        const isSafe = document.getElementById('result-container').classList.contains('safe-result');
        
        if (!isSafe) {
            const proceed = confirm('This website has been flagged as unsafe. Are you sure you want to proceed?');
            if (!proceed) return;
        }
        
        window.open(url, '_blank');
    });

    // Initialize the page based on URL parameters
    initializePage();
});

function showResult(type, url, status, threats, details, qrImage = '') {
    const resultContainer = document.getElementById('result-container');
    const resultIcon = document.getElementById('result-icon');
    const resultTitle = document.getElementById('result-title');
    const resultDesc = document.getElementById('result-description');
    const resultDetails = document.getElementById('result-details');
    const actionBtn = document.getElementById('action-btn');
    const threatTypesContainer = document.getElementById('threat-types-container');
    const threatDetailsContainer = document.getElementById('threat-details-container');
    const threatDetailsContent = document.getElementById('threat-details-content');

    // Reset UI elements
    threatDetailsContainer.style.display = 'none';
    threatDetailsContent.innerHTML = '';
    actionBtn.style.display = 'block';

    // Set URL text
    document.getElementById('url-text').textContent = url;

    // Clear previous threat types
    threatTypesContainer.innerHTML = '';

    // Configure based on result status
    switch(status) {
        case 'safe':
            resultContainer.className = 'result-container safe-result';
            resultIcon.textContent = 'check_circle';
            resultIcon.className = 'material-icons result-icon safe-icon';
            resultTitle.textContent = 'This URL is safe!';
            resultDesc.textContent = 'No threats detected by Google Safe Browsing.';
            actionBtn.className = 'action-btn safe-btn';
            actionBtn.textContent = 'Visit Website';
            break;
            
        case 'unsafe':
            resultContainer.className = 'result-container unsafe-result';
            resultIcon.textContent = 'warning';
            resultIcon.className = 'material-icons result-icon unsafe-icon';
            resultTitle.textContent = 'This URL is dangerous!';
            resultDesc.textContent = 'Google Safe Browsing detected potential threats.';
            actionBtn.className = 'action-btn unsafe-btn';
            actionBtn.textContent = 'Visit Anyway';
            
            // Show threat details section
            threatDetailsContainer.style.display = 'block';
            
            // Add detailed threat information
            threats.forEach(threat => {
                const badge = document.createElement('span');
                badge.className = 'threat-type';
                badge.textContent = threat.type;
                threatTypesContainer.appendChild(badge);
                
                const threatItem = document.createElement('div');
                threatItem.className = 'threat-item';
                
                const typeLabel = document.createElement('span');
                typeLabel.className = 'threat-type-label';
                typeLabel.textContent = `${threat.type} Threat`;
                
                const description = document.createElement('span');
                description.className = 'threat-description';
                description.textContent = threat.description;
                
                threatItem.appendChild(typeLabel);
                threatItem.appendChild(description);
                threatDetailsContent.appendChild(threatItem);
            });
            break;
            
        default:
            resultContainer.className = 'result-container warning-result';
            resultIcon.textContent = 'error_outline';
            resultIcon.className = 'material-icons result-icon warning-icon';
            resultTitle.textContent = 'Scan Error';
            resultDesc.textContent = 'Unable to determine safety status.';
            actionBtn.className = 'action-btn warning-btn';
            actionBtn.textContent = 'Try Again';
            actionBtn.onclick = function() { location.reload(); };
    }

    // Set details if provided
    if (details) {
        resultDetails.textContent = details;
    } else {
        resultDetails.textContent = '';
    }
}

function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    
    try {
        const dataParam = urlParams.get('data');
        if (!dataParam) {
            throw new Error('No scan data found in URL.');
        }

        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        const type = decodedData.source_type; // Dynamic type detection
        
        showResult(
            type,
            decodedData.original_url || '',
            decodedData.status || 'unknown',
            decodedData.threat_details || [],
            decodedData.friendly_date || '',
            decodedData.image_data || '' // Will be empty for URLs
        );

    } catch (error) {
        console.error('Failed to load scan data:', error);
        document.getElementById('result-container').className = 'result-container warning-result';
        document.getElementById('result-icon').textContent = 'error';
        document.getElementById('result-title').textContent = 'Error';
        document.getElementById('result-description').textContent = 'Failed to load scan results';
        document.getElementById('result-details').textContent = error.message;
        document.getElementById('action-btn').style.display = 'none';
    }
}
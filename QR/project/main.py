from flask import Flask, request, jsonify, render_template, send_file, url_for, redirect, Response
import requests
import json
from urllib.parse import quote, unquote
from flask_cors import CORS
import time, datetime

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = 'AIzaSyC9NIYQji8k6zcBQNDx5Xm14_fe2qQJOfQ' 
SAFE_BROWSING_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

@app.route('/')
def home():
    return render_template('splash.html')

@app.route('/main')
def main():
    return render_template('main.html')

@app.route('/process_qr', methods=['POST'])
def process_qr():
    url = request.form.get('qr_url')
    unsafe_url_threat_types = {
        "MALWARE": "Websites or downloads that try to harm your device or steal your information.",
        "SOCIAL_ENGINEERING": "Trick websites (like phishing) that try to fool you into giving away personal info like passwords or credit card numbers.",
        "UNWANTED_SOFTWARE": "Programs that you probably don't want, like toolbars or apps that change your settings without asking.",
        "POTENTIALLY_HARMFUL_APPLICATION": "Mobile apps (mostly Android) that could be risky or cause problems, flagged by Google Play Protect.", 
        "THREAT_TYPE_UNSPECIFIED": "There might be something risky or unsafe here, but we don’t know exactly what kind of danger it is."
    }
    
    if not url:
        return redirect(url_for('error_page', message='No URL provided'))
    
    try:
        # Step 1: Prepare Google Safe Browsing API request
        request_body = {
            "client": {
                "clientId": "your-pwa",
                "clientVersion": "1.0"
            },
            "threatInfo": {
                "threatTypes": list(unsafe_url_threat_types.keys()),  # Use all defined threat types
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }

        # Step 2: Make API request
        response = requests.post(
            f"{SAFE_BROWSING_URL}?key={GOOGLE_API_KEY}",
            headers={'Content-Type': 'application/json'},
            json=request_body
        )

        # Log the response
        print(f"Google API Response: {response.status_code} - {response.text}")

        if response.status_code != 200:
            return redirect(url_for('error_page', 
                                 message=f'Google API error: {response.text}'))

        # Step 3: Process results
        response_data = response.json()
        is_unsafe = 'matches' in response_data and len(response_data['matches']) > 0
        
        # Enhanced threat information using the dictionary
        threats = []
        if is_unsafe:
            for match in response_data['matches']:
                threat_type = match['threatType']
                threats.append({
                    'type': threat_type,
                    'description': unsafe_url_threat_types.get(threat_type, "Potential security threat"),
                    'platform': match.get('platformType', 'N/A'),
                    'detail': match.get('threat', {}).get('url', '')
                })

        # Prepare comprehensive result JSON
        result = {
            'original_url': url,
            'status': 'unsafe' if is_unsafe else 'safe',
            'threat_details': threats if is_unsafe else [],
            'scan_date': int(time.time()),
            'friendly_date': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Encode the result for URL parameter
        encoded_result = quote(json.dumps(result))
        
        return redirect(url_for('scan_results', data=encoded_result))
        
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        return redirect(url_for('error_page', message=str(e)))
    
@app.route('/scan_results')
def scan_results():
    encoded_data = request.args.get('data')
    if not encoded_data:
        return redirect(url_for('error_page', message='No scan data provided'))

    try:
        scan_data = json.loads(unquote(encoded_data))
        
        # Prepare template context
        context = {
            'type': 'qr',  # Hardcoded as 'qr' since this is the QR processing route
            'url': scan_data['original_url'],
            'status': scan_data['status'],
            'threats': [
                f"{threat['type']}: {threat['description']}"
                for threat in scan_data.get('threat_details', [])
            ],
            'details': f"Scan date: {scan_data['friendly_date']}",
            'qr_image': '',  # You can add QR image URL if available
            # Additional structured data for more detailed templates
            'threat_details': scan_data.get('threat_details', []),
            'scan_timestamp': scan_data['scan_date'],
            'friendly_date': scan_data['friendly_date']
        }

        return render_template(
            'result.html',
            **context
        )
        
    except Exception as e:
        print(f"Error rendering results: {str(e)}")
        return redirect(url_for('error_page', message='Invalid scan data format'))
    
@app.route('/error')
def error_page():
    error_message = request.args.get('message', 'An unknown error occurred')
    return f"Error: {error_message}", 400

if __name__ == '__main__':
    app.run(debug=True)


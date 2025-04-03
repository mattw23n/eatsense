# EatSense Setup Guide

This guide provides step-by-step instructions for setting up and running both the backend and frontend components of the EatSense application.

## Backend Setup
Navigate to the backend directory and set up a Python environment:

```bash
cd backend
python -m venv env
```

Activate the virtual environment:

Windows
```bash
env\scripts\activate
```

macOS/Linux
```bash
source env/bin/activate
```

Install dependencies
```bash
pip install -r requirements.txt
```

Start the backend server
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
## Frontend Setup
Install dependencies in the root directory for Expo
```bash
npm install
```

Navigate to the frontend directory and install React Native dependencies
```bash
cd frontend
npm install
```

Update the configuration file `config.js` with your local IP address
```C
# Edit config.js and update the API_URL with your computer's IP address
# Example: API_URL: "http://192.168.1.100:8000"
```

Start the Expo development server
```bash
npx expo start
```

After running this command, you can:
1. Scan the QR code with the Expo Go app on your mobile device
2. Follow the instructions to either restart, open the debugger, or open an emulator
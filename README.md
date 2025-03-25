# to run

# running backend server
1. cd backend
2. env\scripts\activate
3. python load_data.py
4. python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# running frontend
1. cd frontend
2. update config.js to laptop's IP address
3. npx expo start
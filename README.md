<div align="center">

![header](https://capsule-render.vercel.app/api?type=waving&color=gradient&height=200&section=header&text=SafeLPG%20AI&fontSize=50&fontColor=fff)

![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&pause=1000&color=F97316&center=true&vCenter=true&width=600&lines=Intelligent+LPG+cylinder+monitoring;Leak+%26+flame+detection+with+live+alerts;Built+for+HACKELITE+2026+by+Hexa+Coders)

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![Made By](https://img.shields.io/badge/Made%20by-Fayaz--2007-blueviolet?style=for-the-badge)

</div>

## 📌 Overview

LPG cylinders run out or leak without warning, and manual checks only catch trouble after the fact. SafeLPG AI reads live weight, gas-ppm, temperature and flame readings from an ESP32-based sensor rig, analyzes each reading in a FastAPI backend, and pushes status and alerts to a React dashboard over a WebSocket in real time. When gas or flame readings cross a danger threshold it fires an SMS alert, and it also tracks "book cylinder" prompts so refills happen before the tank runs dry. Built by team Hexa Coders for HACKELITE 2026.

## ✨ Features

- ⚖️ Live cylinder weight, gas-ppm, temperature and flame-sensor ingestion via `POST /api/sensor-data`
- 📡 Real-time dashboard updates over a `/ws/live` WebSocket, no polling
- 🚨 Automatic leak/flame danger analysis with severity-ranked alerts
- 📲 SMS alerts for danger/critical severity events
- 🛒 Proactive refill-booking tracking (`booking-initiated` + history) to quantify "N proactive prompts triggered"
- ⚙️ Configurable registered mobile number and gas-provider booking link
- 🧪 `mock_esp32.py` simulator to demo leak/flame events without real hardware
- 📈 Recharts-powered history and analytics charts on the frontend

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | ![React](https://img.shields.io/badge/React%2019-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![Recharts](https://img.shields.io/badge/Recharts-FF6384?style=flat-square) |
| Backend | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) ![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=flat-square&logo=pydantic&logoColor=white) ![WebSockets](https://img.shields.io/badge/WebSockets-black?style=flat-square) |
| Database | ![SQLite](https://img.shields.io/badge/SQLite-07405E?style=flat-square&logo=sqlite&logoColor=white) |
| Hardware (simulated) | ESP32 (weight, gas, temp, flame sensors) |

## 🏗️ Architecture

```mermaid
flowchart LR
    ESP[ESP32 sensor rig\n(or mock_esp32.py)] -->|POST /api/sensor-data| API[FastAPI backend]
    API --> AN[analytics.py\nleak / flame analysis]
    AN --> DB[(SQLite\nsafelpg.db)]
    AN --> SMS[sms_alert.py]
    API -->|WebSocket /ws/live| UI[React + Recharts dashboard]
    UI -->|POST /api/booking-initiated| API
```

## 📂 Project Structure

```
hackelie-2026/
├── backend/
│   ├── main.py          # FastAPI app, REST + WebSocket routes
│   ├── analytics.py     # reading analysis & alert generation
│   ├── sms_alert.py      # SMS notification helper
│   ├── mock_esp32.py     # sensor simulator for demos
│   └── requirements.txt
├── database/
│   ├── db.py             # SQLite access layer
│   └── safelpg.db
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── htr.txt                # quick-start commands
```

## ⚙️ Installation

```bash
git clone https://github.com/Fayaz-2007/hackelie-2026.git
cd hackelie-2026

# Backend (from project root, so the sibling `database` package resolves)
python -m venv venv
venv/Scripts/pip install -r backend/requirements.txt
venv/Scripts/python.exe -m uvicorn backend.main:app --reload --port 8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev
```

Open the frontend at `http://localhost:5173`.

## 🚀 Usage

1. Start the backend and frontend as above.
2. Since there's no physical ESP32 by default, simulate sensor data:
   ```bash
   venv/Scripts/python.exe backend/mock_esp32.py
   # or trigger a demo event directly
   venv/Scripts/python.exe backend/mock_esp32.py --trigger-leak-at 10
   venv/Scripts/python.exe backend/mock_esp32.py --trigger-flame-at 15
   ```
3. Watch the dashboard update live as readings stream in over the WebSocket.
4. Set a registered mobile number and provider booking link under settings to enable SMS alerts and the "Book Cylinder" flow.

`[Screenshot: live monitoring dashboard]`

`[Screenshot: alert / SMS notification view]`

## 🔮 Future Improvements

- Replace `mock_esp32.py` with real ESP32 firmware and hardware integration
- Add user authentication for multi-household deployments
- Predictive refill timing based on historical consumption trends
- Push notifications in addition to SMS
- Deploy backend + dashboard for a persistent live demo

## 👨‍💻 Author

**Fayaz Ahmed**
GitHub: [@Fayaz-2007](https://github.com/Fayaz-2007)
LinkedIn: [fayaz-ahmed-59287631a](https://linkedin.com/in/fayaz-ahmed-59287631a)

<div align="center">

![footer](https://capsule-render.vercel.app/api?type=waving&color=gradient&height=150&section=footer)

</div>

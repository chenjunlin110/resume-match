# Resume Match - AI-Powered Resume Analysis & Job Matching

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Go](https://img.shields.io/badge/Go-1.19+-blue.svg)](https://golang.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

An intelligent resume analysis and job matching system that leverages AI/LLM technology to provide real-time feedback and suggestions for resume optimization.

## 🚀 Features

- **Multi-format Support**: Parse resumes in PDF, DOCX, and TXT formats
- **AI-Powered Analysis**: Leverage Ollama with local LLM inference for privacy
- **Real-time Streaming**: Get instant feedback with Server-Sent Events (SSE)
- **Skill Extraction**: Automatically identify and extract skills from resumes
- **Job Description Matching**: Compare resume content against job requirements
- **Modern Web Interface**: Beautiful React-based UI with Material-UI components
- **Docker Ready**: Easy deployment with Docker Compose

## 🏗️ Architecture

The project consists of four main services:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend  │    │   Backend   │    │ ML Service  │    │   Ollama    │
│   (React)  │◄──►│    (Go)     │◄──►│  (Python)   │◄──►│  (LLM)      │
│   Port 3000│    │  Port 8080  │    │  Port 8000  │    │  Port 11434 │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Service Details

- **Frontend**: React 18 + Vite + Material-UI, responsive web interface
- **Backend**: Go + Gin framework, handles file uploads and API routing
- **ML Service**: Python + FastAPI, processes resumes and integrates with LLM
- **Ollama**: Local LLM inference engine with GPU acceleration support

## 📋 Prerequisites

- **Docker & Docker Compose**: For containerized deployment
- **Git**: For cloning the repository
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/chenjunlin110/resume-match.git
cd resume-match
```

### 2. Start Services with Docker Compose

```bash
# Navigate to infrastructure directory
cd infra

# Start all services
docker compose -f docker-compose.mac.yml up -d

```

### 3. Verify Services

```bash
# Check service status
docker compose ps

# View logs
docker compose logs -f
```

## 🚀 Usage

### Web Interface

1. **Open your browser** and navigate to `http://localhost:3000`
2. **Upload a resume** file (PDF, DOCX, or TXT format)
3. **Enter job description** text in the provided field
4. **Submit** and watch real-time AI analysis
5. **Review results** including skill extraction and matching suggestions

### API Endpoints

#### Traditional Response
```bash
POST /api/upload
Content-Type: multipart/form-data

Parameters:
- jd_text: Job description text
- resume_file: Resume file upload
```

#### Streaming Response (Recommended)
```bash
POST /api/upload_stream
Content-Type: multipart/form-data

Parameters:
- jd_text: Job description text
- resume_file: Resume file upload

Response: Server-Sent Events (SSE) stream
```

### Sample Files

Test the system with sample files in the `docs/samples/` directory:
- `resume_sample.txt` - Sample resume content
- `jd_sample.txt` - Sample job description

## 🔧 Configuration

### Environment Variables

#### Backend Service
```bash
ML_URL=http://ml:8000/api/score_file_stream  # ML service endpoint
```

#### ML Service
```bash
OLLAMA_BASE_URL=http://ollama:11434  # Ollama service URL
```

#### Ollama Service
```bash
OLLAMA_GPU_LAYERS=35              # GPU acceleration layers
OLLAMA_FLASH_ATTENTION=true       # Flash attention optimization
OLLAMA_METAL=1                    # Apple Metal GPU support (macOS)
```

### Docker Compose Configuration

The `docker-compose.mac.yml` file includes:
- Port mappings for all services
- Volume mounts for persistent data
- Environment variable configurations
- Service dependencies and health checks

## 🧪 Testing

### Test Streaming API

```bash
# Test the streaming endpoint directly
curl -v -X POST http://localhost:8080/api/upload_stream \
  -F "jd_text=Go programming" \
  -F "resume_file=@../docs/samples/resume_sample.txt" \
  --no-buffer
```

### Test Individual Services

```bash
# Test ML service
curl http://localhost:8000/health

# Test backend
curl http://localhost:8080/health

# Test Ollama
curl http://localhost:11434/api/tags
```

## 🚀 Development

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Backend Development

```bash
cd backend
go mod tidy
go run main.go
```

### ML Service Development

```bash
cd ml_service
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## 📁 Project Structure

```
resume-match/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   └── config.ts        # API configuration
│   ├── Dockerfile           # Frontend container
│   └── package.json
├── backend/                  # Go backend service
│   ├── main.go              # Main application
│   └── Dockerfile           # Backend container
├── ml_service/              # Python ML service
│   ├── app.py               # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # ML service container
├── infra/                   # Infrastructure configuration
│   ├── docker-compose.mac.yml  # Docker Compose for macOS
│   └── docker-compose.yml      # Standard Docker Compose
├── docs/                    # Documentation and samples
│   └── samples/             # Sample files for testing
└── README.md                # This file
```


## 🔒 Security & Privacy

- **Local LLM**: All AI processing happens locally via Ollama
- **No External APIs**: No data sent to third-party services
- **File Handling**: Secure file upload and processing
- **CORS Configuration**: Proper cross-origin resource sharing setup



## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) - Local LLM inference
- [FastAPI](https://fastapi.tiangolo.com/) - Python web framework
- [Gin](https://gin-gonic.com/) - Go web framework
- [React](https://reactjs.org/) - Frontend framework
- [Material-UI](https://mui.com/) - UI component library

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/chenjunlin110/resume-match/issues)
- **Connect**: [Gmail](chenjunlin110@gmail.com)

---

**Made with ❤️ by Junlin Chen**

*Transform your resume with AI-powered insights and real-time feedback.*

# Resume Match - Project Overview

## 🎯 Project Vision

Resume Match is an AI-powered platform that revolutionizes the resume analysis and job matching process. By leveraging local Large Language Models (LLMs) through Ollama, it provides real-time, privacy-focused feedback to help users optimize their resumes for specific job opportunities.

## 🏗️ Technical Architecture

### System Overview

```
┌─────────────────┐    HTTP/SSE    ┌─────────────────┐
│   Frontend      │◄──────────────►│    Backend      │
│   (React)       │                │     (Go)        │
│   Port 3000     │                │   Port 8080     │
└─────────────────┘                └─────────────────┘
                                              │
                                              │ HTTP
                                              ▼
                                    ┌─────────────────┐
                                    │   ML Service    │
                                    │   (Python)      │
                                    │   Port 8000     │
                                    └─────────────────┘
                                              │
                                              │ HTTP
                                              ▼
                                    ┌─────────────────┐
                                    │     Ollama      │
                                    │   (LLM)        │
                                    │   Port 11434    │
                                    └─────────────────┘
```

### Service Responsibilities

#### 1. Frontend (React + TypeScript)

- **Technology Stack**: React 18, Vite, Material-UI, TypeScript
- **Key Features**:
  - File upload interface with drag-and-drop support
  - Real-time streaming display using Server-Sent Events
  - Responsive design with Material-UI components
  - Form validation and error handling
- **State Management**: React hooks for local state
- **API Integration**: Fetch API with streaming support

#### 2. Backend (Go + Gin)

- **Technology Stack**: Go 1.21+, Gin framework, HTTP client
- **Key Features**:
  - File upload handling and validation
  - Request proxying to ML service
  - CORS configuration
  - Streaming response forwarding
- **Architecture**: RESTful API with middleware support
- **Performance**: Optimized for concurrent requests

#### 3. ML Service (Python + FastAPI)

- **Technology Stack**: Python 3.11+, FastAPI, LiteLLM, PyPDF2, python-docx
- **Key Features**:
  - Multi-format resume parsing (PDF, DOCX, TXT)
  - Skill extraction and analysis
  - LLM integration via LiteLLM
  - Streaming response generation
- **AI Integration**: OpenAI-compatible API to Ollama
- **File Processing**: Efficient text extraction and cleaning

#### 4. Ollama Service

- **Technology Stack**: Ollama with local model inference
- **Key Features**:
  - Local LLM processing for privacy
  - GPU acceleration support (Apple Metal)
  - Flash Attention optimization
  - Model management and switching
- **Performance**: Optimized for inference speed

## 🔄 Data Flow

### 1. Resume Upload Process

```
User Upload → Frontend → Backend → ML Service → File Parsing → Text Extraction
```

### 2. Analysis Process

```
Extracted Text → Skill Analysis → LLM Prompt → Ollama → Response Generation
```

### 3. Streaming Response

```
LLM Response → ML Service → Backend → Frontend → Real-time Display
```

## 🚀 Key Features Implementation

### Real-time Streaming

- **Technology**: Server-Sent Events (SSE)
- **Implementation**:
  - ML service generates streaming responses
  - Backend forwards streams to frontend
  - Frontend displays content in real-time
- **Benefits**: Immediate feedback, better user experience

### Multi-format Support

- **PDF**: PyPDF2 for text extraction
- **DOCX**: python-docx for structured content
- **TXT**: Direct text processing
- **Fallback**: Graceful error handling for unsupported formats

### Privacy-First Design

- **Local Processing**: All AI operations happen locally
- **No External APIs**: Complete data sovereignty
- **Secure Handling**: Proper file validation and cleanup

## 🔧 Configuration Management

### Environment Variables

```bash
# Backend
ML_URL=http://ml:8000/api/score_file_stream

# ML Service
OLLAMA_BASE_URL=http://ollama:11434

# Ollama
OLLAMA_GPU_LAYERS=35
OLLAMA_FLASH_ATTENTION=true
OLLAMA_METAL=1
```

### Docker Configuration

- **Multi-stage builds** for optimized images
- **Service dependencies** and health checks
- **Volume mounts** for persistent data
- **Port mapping** for service communication

### Input Validation

- File type verification
- Size limits enforcement
- Content sanitization
- Malicious file detection

### Network Security

- CORS configuration
- Request rate limiting
- Secure file handling
- No external data transmission

### Privacy Protection

- Local data processing
- No logging of sensitive content
- Secure file cleanup
- User data isolation

## 🔍 Monitoring and Debugging

### Logging Strategy

- **Backend**: Structured logging with levels
- **ML Service**: Detailed processing logs
- **Ollama**: Model inference logs
- **Frontend**: Error logging and user feedback

### Health Checks

- Service availability monitoring
- Dependency checking
- Performance metrics
- Error rate tracking

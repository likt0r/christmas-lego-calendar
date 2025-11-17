# LEGO December Calendar Manager

A modern web application built with Nuxt.js 4 and Nuxt UI for managing LEGO December Calendar models. Upload PDF instructions and CSV data to automatically generate daily PDFs and secure QR codes for easy access.

## Features

- **Model Management**: Upload, view, and delete LEGO calendar models
- **PDF Processing**: Automatically split PDF instructions into daily builds
- **QR Code Generation**: Generate QR codes with secure download links for each day's instructions
- **Secure Downloads**: Token-based secure download system for PDF files
- **Modern UI**: Built with Nuxt UI components for a beautiful, responsive interface
- **File Upload**: Drag-and-drop interface for PDF and CSV files
- **Real-time Validation**: Check model name availability before upload
- **Admin Interface**: Protected admin area for model management
- **Docker Support**: Containerized deployment ready

## Getting Started

### Prerequisites

- Node.js 20+ or Bun 1.0+
- A LEGO December Calendar PDF file
- A CSV file with day/page mappings

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd christmas-lego-calendar
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Configure the application:

   Edit `nuxt.config.ts` to set your configuration:

   - `baseUrl`: The base URL for your application (used in QR code generation)
   - `modelsDir`: Directory where model files are stored (default: "files")
   - `basicAuth`: Configure admin authentication

4. Start the development server:

   ```bash
   bun run dev
   ```

5. Open http://localhost:3000 in your browser

## Docker Deployment

### Building the Image

```bash
docker build -t christmas-lego-calendar .
```

### Running the Container

```bash
docker run -p 3000:3000 christmas-lego-calendar
```

### With Environment Variables

You can override the baseUrl using environment variables:

```bash
docker run -p 3000:3000 \
  -e NUXT_BASE_URL=https://your-domain.com \
  christmas-lego-calendar
```

### Docker Compose (Optional)

Create a `docker-compose.yml`:

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NUXT_BASE_URL=https://your-domain.com
      - NUXT_BASIC_AUTH_USERS=admin:abcd1234!D
    volumes:
      - ./files:/app/files
```

Then run:

```bash
docker-compose up -d
```

## Usage

### Adding a New Model

1. Navigate to the admin interface (protected by basic auth)
2. Click "Add New Model"
3. Enter a unique model name (letters, numbers, hyphens, underscores only)
4. Upload your PDF instruction file
5. Upload your CSV file with day/page mappings
6. Click "Upload Model" - the system will automatically:
   - Split the PDF into daily instruction files
   - Generate secure tokens for each day
   - Generate QR codes with secure download links
   - Make everything available through the web interface

### CSV Format

Your CSV file should have the following columns:

- `day`: Day number
- `step_start`: Starting step number for the day
- `step_end`: Ending step number for the day
- `page_start`: Starting page number in the PDF
- `page_end`: Ending page number in the PDF

Example:

```csv
day,step_start,step_end,page_start,page_end,,
1,1,16,6,12,,16
2,17,32,13,19,,16
3,33,51,20,25,,19
```

### Managing Models

- **View Days**: Click on a model to see all available days
- **Download PDFs**: Access individual day PDFs via secure download links
- **Download QR Codes**: Get a PDF with QR codes for all days
- **Delete Model**: Remove a model and all its associated files (admin only)

## API Endpoints

### Public Endpoints

- `GET /` - Home page with model list
- `GET /models/[model]` - Model detail page with all days
- `GET /api/models` - List all available models
- `GET /api/models/[model]` - Get details for a specific model
- `GET /api/download/[randomId]` - Secure download endpoint for PDF files

### Admin Endpoints (Protected)

- `GET /admin` - Admin interface
- `POST /api/models/upload` - Upload a new model
- `DELETE /api/models/[model]/delete` - Delete a model
- `GET /api/models/[model]/qr-codes` - Download QR codes PDF

## Configuration

### Runtime Configuration

Edit `nuxt.config.ts` to configure:

```typescript
runtimeConfig: {
  modelsDir: "files",              // Directory for model files
  baseUrl: "http://localhost:3000", // Base URL for QR codes
  basicAuth: {
    enabled: true,
    users: [
      {
        username: "admin",
        password: "admin",  // Change this!
      },
    ],
    allowedRoutes: [
      "^/$",                    // Public home page
      "^/api/download/.*",      // Public download endpoint
    ],
  },
}
```

### Environment Variables

You can override configuration using environment variables:

- `NUXT_BASE_URL` - Override baseUrl
- `NUXT_MODELS_DIR` - Override modelsDir
- `NUXT_BASIC_AUTH_USERS` - Override basic auth users (format: `username:password`, e.g., `NUXT_BASIC_AUTH_USERS=admin:abcd1234!D`)

## Development

### Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run split` - Run PDF splitter script manually
- `bun run qr` - Run QR code generator script manually

### Project Structure

```
├── app/
│   ├── pages/
│   │   ├── index.vue              # Main page with model list
│   │   ├── admin/
│   │   │   └── index.vue          # Admin interface
│   │   └── models/
│   │       └── [model].vue        # Model detail page
│   ├── components/
│   │   └── ModelCard.vue          # Model card component
│   ├── middleware/
│   │   └── admin-auth.ts          # Admin authentication middleware
│   └── assets/
│       └── css/
│           └── main.css           # Global styles
├── server/
│   ├── api/
│   │   ├── models/                # Model management API
│   │   ├── download/              # Secure download API
│   │   └── [...path].ts          # Catch-all API handler
│   └── utils/
│       └── tokens.ts              # Token management utilities
├── script/
│   ├── split-pdf.ts              # PDF splitting logic
│   └── generate-qr-codes.ts      # QR code generation
├── files/                        # Generated model files (gitignored)
├── csv/                          # CSV template files
├── pdfs/                         # Source PDF files
├── Dockerfile                    # Docker configuration
└── .github/
    └── workflows/
        └── ci.yml                # GitHub Actions CI/CD
```

## CI/CD

The project includes GitHub Actions workflow for:

- **Automated Testing**: Build verification on every push and PR
- **Docker Image Building**: Automatic Docker image builds
- **Container Registry**: Images pushed to GitHub Container Registry (GHCR)

Images are available at: `ghcr.io/likt0r/christmas-lego-calendar`

## Security

- **Basic Authentication**: Admin routes are protected with HTTP Basic Auth
- **Secure Downloads**: PDF files are accessed via secure token-based URLs
- **Token System**: Each day's PDF has a unique, random token for access
- **Non-root Docker User**: Container runs as non-root user for security

## Technologies Used

- **Nuxt.js 4** - Vue.js framework with SSR
- **Nuxt UI** - Component library
- **PDF-lib** - PDF manipulation
- **QRCode** - QR code generation
- **CSV Parser** - CSV file processing
- **Zod** - Form validation
- **Bun** - Fast JavaScript runtime and package manager
- **TypeScript** - Type safety

## License

MIT License - see [LICENSE](LICENSE) file for details.

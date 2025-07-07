# Fylr.Chat

An alternative to NotebookLM for analyzing and querying large collections of documents.

## Features

- **Document Analysis**: Process multiple file formats (PDF, text, markdown, etc.)
- **Question Answering**: Query your document collection using natural language
- **Multi-format Support**: Handles various file types for different use cases

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/VpgMackan/fylr.chat
   cd fylr.chat
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create and configure the required `.env` files in both the `web` and `backend` package directories. Both files must be properly configured for the application to function.

4. **Start the application**

   ```bash
   npm run dev
   ```

   Or run components separately:

   ```bash
   npm run dev:backend
   npm run dev:web
   ```

## Usage

Upload your documents and start asking questions about their content using natural language queries.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License.

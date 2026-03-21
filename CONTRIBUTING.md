# Contributing to BlankWhale

Thank you for your interest in contributing to BlankWhale! We welcome contributions from the community.

## Getting Started

### Prerequisites
- Node.js 18+
- Rust 1.77+
- Python 3.10+

### Development Setup

```bash
# Clone the repo
git clone https://github.com/blankwhale/blankwhale.git
cd blankwhale

# Install frontend dependencies
npm install

# Install Python training engine
cd engine
pip install -r requirements.txt
cd ..

# Run in development mode (web)
npm run dev

# Run as desktop app
npx tauri dev
```

## Project Structure

```
blankwhale/
  src/                    # React frontend (TypeScript)
  src-tauri/              # Tauri desktop shell (Rust)
  engine/                 # Python training engine
  public/                 # Static assets
```

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run build && cargo check`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

## Code Style

- **TypeScript**: Follow existing patterns, use functional components
- **Rust**: Run `cargo fmt` before committing
- **Python**: Follow PEP 8, use type hints

## Areas to Contribute

- New model format support in `engine/export.py`
- Additional data format parsers in `engine/data_pipeline.py`
- UI improvements in `src/workspace/`
- Documentation and tutorials
- Bug fixes and performance improvements

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

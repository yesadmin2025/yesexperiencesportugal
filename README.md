# Yes Experiences Portugal - Web Application

A modern TypeScript React web application showcasing Portugal experiences.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
gh repo clone yesadmin2025/yesexperiencesportugal
cd yesexperiencesportugal

# Install dependencies
npm install
```

### Development

```bash
# Start development server (opens at http://localhost:3000)
npm run dev

# Run tests with coverage
npm run test

# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check
```

### Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast build and dev server)
- **Testing**: Vitest with React Testing Library
- **Code Quality**:
  - ESLint (code linting)
  - Prettier (code formatting)
  - TypeScript (strict type checking)
- **CI/CD**: GitHub Actions (automated testing and building)

## 📁 Project Structure

```
yesexperiencesportugal/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # GitHub Actions workflow
├── src/
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Main App component
│   ├── App.css                # App styles
│   ├── App.test.tsx           # App component tests
│   └── index.css              # Global styles
├── index.html                 # HTML entry point
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tsconfig.node.json         # TypeScript config for build tools
├── vite.config.ts             # Vite configuration
├── vitest.config.ts           # Vitest configuration
├── .eslintrc.json             # ESLint configuration
├── .prettierrc.json           # Prettier configuration
└── .gitignore                 # Git ignore file
```

## 🔧 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |
| `npm test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Check TypeScript types |

## 🧪 Testing

Tests are located alongside components with `.test.tsx` extension.

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test -- --watch
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow automatically:

- ✅ Installs dependencies
- ✅ Checks TypeScript types
- ✅ Lints code
- ✅ Runs tests
- ✅ Builds the application
- ✅ Uploads build artifacts
- ✅ Prepares for deployment

Triggered on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

## 📝 Git Workflow

```bash
# Configure git (run once)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create a new branch for features
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

## 📖 Development Tips

- **Fast Refresh**: Changes are automatically reflected in the browser during development
- **Type Safety**: TypeScript catches errors at compile time
- **Code Quality**: ESLint and Prettier ensure consistent code style
- **Testing**: Write tests alongside your components

## 📄 License

MIT

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make your changes and add tests
3. Run `npm run lint` and `npm run format`
4. Submit a pull request

---

**Ready to build amazing experiences in Portugal! 🇵🇹**

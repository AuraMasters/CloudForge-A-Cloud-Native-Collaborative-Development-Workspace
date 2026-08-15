export const getTemplateFiles = (templateName, projectName = "CloudForge Project") => {
  const normalized = (templateName || "blank").toLowerCase();

  switch (normalized) {
    case "react":
    case "typescript":
      return [
        {
          name: "package.json",
          path: "/package.json",
          type: "file",
          language: "json",
          content: JSON.stringify(
            {
              name: projectName.toLowerCase().replace(/\s+/g, "-"),
              private: true,
              version: "1.0.0",
              type: "module",
              scripts: {
                dev: "vite",
                build: "tsc -b && vite build",
                lint: "eslint .",
                preview: "vite preview",
              },
              dependencies: {
                react: "^19.0.0",
                "react-dom": "^19.0.0",
                "lucide-react": "^0.475.0",
              },
              devDependencies: {
                "@types/react": "^19.0.0",
                "@types/react-dom": "^19.0.0",
                "@vitejs/plugin-react": "^4.3.4",
                typescript: "~5.7.2",
                vite: "^6.2.0",
              },
            },
            null,
            2
          ),
        },
        {
          name: "README.md",
          path: "/README.md",
          type: "file",
          language: "markdown",
          content: `# ${projectName}\n\nBuilt with CloudForge collaborative development workspace.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Features\n- ⚡️ React 19 + TypeScript + Vite\n- 🎨 Modern UI components\n- 🌐 Cloud-native execution\n`,
        },
        {
          name: "index.html",
          path: "/index.html",
          type: "file",
          language: "html",
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  </head>
  <body class="bg-slate-950 text-slate-100 font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
        },
        {
          name: "src",
          path: "/src",
          type: "directory",
          language: "plaintext",
          content: "",
        },
        {
          name: "main.tsx",
          path: "/src/main.tsx",
          type: "file",
          language: "typescript",
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        },
        {
          name: "index.css",
          path: "/src/index.css",
          type: "file",
          language: "css",
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background-color: #090d16;
  color: #f8fafc;
  min-height: 100vh;
}

.gradient-text {
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}`,
        },
        {
          name: "App.tsx",
          path: "/src/App.tsx",
          type: "file",
          language: "typescript",
          content: `import { useState } from 'react';
import Header from './components/Header';
import FeatureCard from './components/FeatureCard';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#090d16] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        <Header title="${projectName}" />
        
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Welcome to <span className="gradient-text">${projectName}</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Your high-performance cloud development workspace is ready. Edit files and see changes instantly.
          </p>
          
          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setCount((c) => c + 1)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all transform active:scale-95"
            >
              Interactive Counter: {count}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard 
            title="Fast Hot Reload" 
            desc="Instant reflection of changes directly inside your browser workspace."
            icon="⚡"
          />
          <FeatureCard 
            title="Git Version Control" 
            desc="Full commit history graph, branch switcher, and GitHub sync."
            icon="🔀"
          />
          <FeatureCard 
            title="Cloud Ready" 
            desc="Deploy anywhere with containerized workspace portability."
            icon="☁️"
          />
        </div>
      </div>
    </div>
  );
}`,
        },
        {
          name: "components",
          path: "/src/components",
          type: "directory",
          language: "plaintext",
          content: "",
        },
        {
          name: "Header.tsx",
          path: "/src/components/Header.tsx",
          type: "file",
          language: "typescript",
          content: `interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-lg">
          CF
        </div>
        <div>
          <h2 className="font-bold text-lg">{title}</h2>
          <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Workspace Active
          </span>
        </div>
      </div>
      <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono">
        v1.0.0
      </span>
    </header>
  );
}`,
        },
        {
          name: "FeatureCard.tsx",
          path: "/src/components/FeatureCard.tsx",
          type: "file",
          language: "typescript",
          content: `interface FeatureCardProps {
  title: string;
  desc: string;
  icon: string;
}

export default function FeatureCard({ title, desc, icon }: FeatureCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
      <div className="text-3xl">{icon}</div>
      <h3 className="font-bold text-lg text-slate-100">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}`,
        },
        {
          name: ".gitignore",
          path: "/.gitignore",
          type: "file",
          language: "plaintext",
          content: `node_modules
dist
.DS_Store
*.local
.env
`,
        },
      ];

    case "nodejs":
      return [
        {
          name: "package.json",
          path: "/package.json",
          type: "file",
          language: "json",
          content: JSON.stringify(
            {
              name: projectName.toLowerCase().replace(/\s+/g, "-"),
              version: "1.0.0",
              type: "module",
              main: "src/server.js",
              scripts: {
                start: "node src/server.js",
                dev: "nodemon src/server.js",
              },
              dependencies: {
                express: "^4.19.2",
                cors: "^2.8.5",
                dotenv: "^16.4.5",
              },
            },
            null,
            2
          ),
        },
        {
          name: "README.md",
          path: "/README.md",
          type: "file",
          language: "markdown",
          content: `# ${projectName} API\n\nNode.js Express REST API created on CloudForge.\n\n## Endpoints\n- \`GET /\` - Health check\n- \`GET /api/status\` - System status\n- \`GET /api/users\` - List users\n`,
        },
        {
          name: "src",
          path: "/src",
          type: "directory",
          language: "plaintext",
          content: "",
        },
        {
          name: "server.js",
          path: "/src/server.js",
          type: "file",
          language: "javascript",
          content: `import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: "${projectName}",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(\`Server listening on port \${PORT}\`);
});`,
        },
        {
          name: "routes",
          path: "/src/routes",
          type: "directory",
          language: "plaintext",
          content: "",
        },
        {
          name: "api.js",
          path: "/src/routes/api.js",
          type: "file",
          language: "javascript",
          content: `import express from 'express';
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    status: 'healthy'
  });
});

router.get('/users', (req, res) => {
  res.json([
    { id: 1, name: "Alice Johnson", role: "Developer" },
    { id: 2, name: "Bob Smith", role: "Designer" }
  ]);
});

export default router;`,
        },
        {
          name: ".env.example",
          path: "/.env.example",
          type: "file",
          language: "plaintext",
          content: "PORT=3000\nNODE_ENV=development\n",
        },
        {
          name: ".gitignore",
          path: "/.gitignore",
          type: "file",
          language: "plaintext",
          content: "node_modules\n.env\n*.log\n",
        },
      ];

    case "python":
      return [
        {
          name: "main.py",
          path: "/main.py",
          type: "file",
          language: "python",
          content: `"""
${projectName}
Main Python Entry Point
"""
import sys
from utils import print_banner, calculate_stats

def main():
    print_banner("${projectName}")
    data = [12, 45, 67, 89, 34, 56, 99]
    stats = calculate_stats(data)
    print(f"Data set: {data}")
    print(f"Computed Statistics: {stats}")
    print("CloudForge Python environment ready!")

if __name__ == '__main__':
    main()
`,
        },
        {
          name: "utils.py",
          path: "/utils.py",
          type: "file",
          language: "python",
          content: `def print_banner(name):
    print("=" * 40)
    print(f"  CloudForge: {name}")
    print("=" * 40)

def calculate_stats(numbers):
    if not numbers:
        return {}
    return {
        "count": len(numbers),
        "min": min(numbers),
        "max": max(numbers),
        "avg": sum(numbers) / len(numbers)
    }
`,
        },
        {
          name: "requirements.txt",
          path: "/requirements.txt",
          type: "file",
          language: "plaintext",
          content: "# Core dependencies\nrequests>=2.31.0\npytest>=7.4.0\n",
        },
        {
          name: "README.md",
          path: "/README.md",
          type: "file",
          language: "markdown",
          content: `# ${projectName}\n\nPython project created in CloudForge Workspace.\n\n## Usage\n\`\`\`bash\npython main.py\n\`\`\`\n`,
        },
        {
          name: ".gitignore",
          path: "/.gitignore",
          type: "file",
          language: "plaintext",
          content: "__pycache__/\n*.pyc\n.env\nvenv/\n",
        },
      ];

    case "html-css":
      return [
        {
          name: "index.html",
          path: "/index.html",
          type: "file",
          language: "html",
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <div class="badge">CloudForge Workspace</div>
    <h1>${projectName}</h1>
    <p>A fast, modern web application running directly from your cloud workspace.</p>
    
    <div class="card">
      <button id="counter-btn" class="btn">Clicks: <span id="count">0</span></button>
      <button id="color-btn" class="btn btn-secondary">Change Gradient</button>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
        },
        {
          name: "styles.css",
          path: "/styles.css",
          type: "file",
          language: "css",
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  max-width: 600px;
  text-align: center;
  padding: 2.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

p {
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.card {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}`,
        },
        {
          name: "app.js",
          path: "/app.js",
          type: "file",
          language: "javascript",
          content: `let count = 0;
const countSpan = document.getElementById('count');
const counterBtn = document.getElementById('counter-btn');
const colorBtn = document.getElementById('color-btn');

counterBtn.addEventListener('click', () => {
  count++;
  countSpan.textContent = count;
});

const gradients = [
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
  'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
  'linear-gradient(135deg, #701a75 0%, #3b0764 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
];

let gradIndex = 0;
colorBtn.addEventListener('click', () => {
  gradIndex = (gradIndex + 1) % gradients.length;
  document.body.style.background = gradients[gradIndex];
});

console.log("${projectName} initialized successfully!");`,
        },
        {
          name: "README.md",
          path: "/README.md",
          type: "file",
          language: "markdown",
          content: `# ${projectName}\n\nVanilla HTML, CSS, and JavaScript project on CloudForge.\n`,
        },
      ];

    default: // blank
      return [
        {
          name: "index.js",
          path: "/index.js",
          type: "file",
          language: "javascript",
          content: `// Welcome to ${projectName}
console.log("Hello from CloudForge Workspace!");

function greet(name) {
  return \`Welcome, \${name}!\`;
}

console.log(greet("Developer"));
`,
        },
        {
          name: "README.md",
          path: "/README.md",
          type: "file",
          language: "markdown",
          content: `# ${projectName}\n\nCreated with CloudForge development workspace.\n\n## Getting Started\nAdd your code and organize your files using the file explorer.\n`,
        },
        {
          name: ".gitignore",
          path: "/.gitignore",
          type: "file",
          language: "plaintext",
          content: ".DS_Store\nnode_modules\n*.log\n",
        },
      ];
  }
};

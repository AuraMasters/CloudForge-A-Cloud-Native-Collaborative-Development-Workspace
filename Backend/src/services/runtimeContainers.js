/**
 * Runtime-specific container configurations.
 * Defines images, resource limits, timeouts, security, and dependency handling
 * for each supported runtime (Node.js, Python, and Generic).
 */

const RUNTIME_CONTAINERS = {
  node: {
    image: "node:20-bookworm-slim",
    displayName: "Node.js 20 & TypeScript",
    installCommand: "npm install",
    depCacheDir: "/root/.npm",
    buildCommand: "npm run build",
    outputDir: "dist",
    resourceLimits: {
      memory: 1536 * 1024 * 1024, // 1536 MB
      memoryDisplay: "1536 MB",
      nanoCpus: 1.5e9, // 1.5 cores
      cpuDisplay: "1.5 Cores",
      pidsLimit: 256,
    },
    timeouts: {
      command: 30000,    // 30s for single commands
      install: 300000,   // 5min for npm install
      build: 300000,     // 5min for builds
      server: 600000,    // 10min for dev servers
      kernelExec: 60000, // 60s for kernel execution
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE", "CHOWN", "SETUID", "SETGID"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=256m" },
    },
    portDetection: {
      patterns: [
        /listening\s+on\s+.*?:?(\d{4,5})/i,
        /Local:\s+https?:\/\/.*?:(\d{4,5})/i,
        /ready\s+on\s+.*?:(\d{4,5})/i,
        /port\s+(\d{4,5})/i,
        /localhost:(\d{4,5})/i,
      ],
      commonPorts: [3000, 3001, 4000, 5000, 5173, 5174, 8000, 8080, 8888],
    },
    healthCheck: "node --version",
    cleanupCommands: [
      "rm -rf /tmp/*",
      "rm -rf node_modules/.cache",
    ],
  },

  python: {
    image: "python:3.11-slim",
    displayName: "Python 3.11",
    installCommand: "pip install -r requirements.txt",
    depCacheDir: "/root/.cache/pip",
    buildCommand: null,
    outputDir: null,
    resourceLimits: {
      memory: 1536 * 1024 * 1024,
      memoryDisplay: "1536 MB",
      nanoCpus: 1.5e9,
      cpuDisplay: "1.5 Cores",
      pidsLimit: 256,
    },
    timeouts: {
      command: 60000,    // 60s for scripts
      install: 300000,   // 5min for pip install
      build: 300000,     // 5min for builds
      server: 600000,    // 10min for dev servers
      kernelExec: 60000, // 60s for kernel execution
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE", "CHOWN", "SETUID", "SETGID"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=256m" },
    },
    portDetection: {
      patterns: [
        /Running on\s+https?:\/\/.*?:(\d{4,5})/i,
        /Serving Flask app.*?:(\d{4,5})/i,
        /Uvicorn running on\s+https?:\/\/.*?:(\d{4,5})/i,
        /Started server process.*?:(\d{4,5})/i,
        /Listening at:\s+https?:\/\/.*?:(\d{4,5})/i,
      ],
      commonPorts: [5000, 8000, 8080, 8888, 5001, 3000],
    },
    healthCheck: "python3 --version",
    cleanupCommands: [
      "rm -rf /tmp/*",
      "find /workspace -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null || true",
      "find /workspace -name '*.pyc' -delete 2>/dev/null || true",
    ],
  },

  generic: {
    image: "ubuntu:22.04",
    displayName: "Generic (Ubuntu 22.04)",
    installCommand: null,
    depCacheDir: null,
    buildCommand: null,
    outputDir: null,
    resourceLimits: {
      memory: 1024 * 1024 * 1024,
      memoryDisplay: "1024 MB",
      nanoCpus: 1e9,
      cpuDisplay: "1.0 Cores",
      pidsLimit: 128,
    },
    timeouts: {
      command: 30000,
      install: 300000,
      build: 300000,
      server: 600000,
      kernelExec: 60000,
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=128m" },
    },
    portDetection: {
      patterns: [/listening.*?:(\d{4,5})/i, /port\s+(\d{4,5})/i],
      commonPorts: [3000, 5000, 8000, 8080],
    },
    healthCheck: "echo ok",
    cleanupCommands: ["rm -rf /tmp/*"],
  },

  go: {
    image: "golang:1.22-bookworm",
    displayName: "Go 1.22",
    installCommand: "go mod download",
    depCacheDir: "/go/pkg/mod",
    buildCommand: "go build -o app main.go",
    outputDir: null,
    resourceLimits: {
      memory: 1536 * 1024 * 1024,
      memoryDisplay: "1536 MB",
      nanoCpus: 1.5e9,
      cpuDisplay: "1.5 Cores",
      pidsLimit: 256,
    },
    timeouts: {
      command: 30000,
      install: 300000,
      build: 300000,
      server: 600000,
      kernelExec: 60000,
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=256m" },
    },
    portDetection: {
      patterns: [/listening.*?:(\d{4,5})/i, /port\s+(\d{4,5})/i, /localhost:(\d{4,5})/i],
      commonPorts: [8080, 8000, 3000, 5000],
    },
    healthCheck: "go version",
    cleanupCommands: ["rm -rf /tmp/*"],
  },

  rust: {
    image: "rust:1.76-slim",
    displayName: "Rust 1.76",
    installCommand: "cargo fetch",
    depCacheDir: "/usr/local/cargo/registry",
    buildCommand: "cargo build --release",
    outputDir: "target/release",
    resourceLimits: {
      memory: 2048 * 1024 * 1024,
      memoryDisplay: "2048 MB",
      nanoCpus: 2.0e9,
      cpuDisplay: "2.0 Cores",
      pidsLimit: 256,
    },
    timeouts: {
      command: 30000,
      install: 300000,
      build: 600000,
      server: 600000,
      kernelExec: 60000,
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=256m" },
    },
    portDetection: {
      patterns: [/listening.*?:(\d{4,5})/i, /port\s+(\d{4,5})/i, /localhost:(\d{4,5})/i],
      commonPorts: [8080, 8000, 3000],
    },
    healthCheck: "rustc --version",
    cleanupCommands: ["rm -rf /tmp/*"],
  },

  cpp: {
    image: "gcc:12-bookworm",
    displayName: "C / C++ (GCC 12)",
    installCommand: null,
    depCacheDir: null,
    buildCommand: "make",
    outputDir: null,
    resourceLimits: {
      memory: 1536 * 1024 * 1024,
      memoryDisplay: "1536 MB",
      nanoCpus: 1.5e9,
      cpuDisplay: "1.5 Cores",
      pidsLimit: 256,
    },
    timeouts: {
      command: 30000,
      install: 120000,
      build: 300000,
      server: 600000,
      kernelExec: 60000,
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=256m" },
    },
    portDetection: {
      patterns: [/listening.*?:(\d{4,5})/i, /port\s+(\d{4,5})/i],
      commonPorts: [8080, 8000],
    },
    healthCheck: "g++ --version",
    cleanupCommands: ["rm -rf /tmp/*"],
  },

  java: {
    image: "openjdk:17-slim",
    displayName: "Java 17 (OpenJDK)",
    installCommand: null,
    depCacheDir: "/root/.m2",
    buildCommand: "javac Main.java",
    outputDir: null,
    resourceLimits: {
      memory: 1536 * 1024 * 1024,
      memoryDisplay: "1536 MB",
      nanoCpus: 1.5e9,
      cpuDisplay: "1.5 Cores",
      pidsLimit: 256,
    },
    timeouts: {
      command: 30000,
      install: 300000,
      build: 300000,
      server: 600000,
      kernelExec: 60000,
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=256m" },
    },
    portDetection: {
      patterns: [/listening.*?:(\d{4,5})/i, /port\s+(\d{4,5})/i],
      commonPorts: [8080, 8000, 9000],
    },
    healthCheck: "java -version",
    cleanupCommands: ["rm -rf /tmp/*"],
  },

  web: {
    image: "node:20-bookworm-slim",
    displayName: "Static Web (HTML5 & CSS)",
    installCommand: null,
    depCacheDir: null,
    buildCommand: null,
    outputDir: null,
    resourceLimits: {
      memory: 1024 * 1024 * 1024,
      memoryDisplay: "1024 MB",
      nanoCpus: 1.0e9,
      cpuDisplay: "1.0 Cores",
      pidsLimit: 128,
    },
    timeouts: {
      command: 30000,
      install: 60000,
      build: 60000,
      server: 600000,
      kernelExec: 60000,
    },
    securityOptions: {
      SecurityOpt: ["no-new-privileges"],
      CapDrop: ["ALL"],
      CapAdd: ["NET_BIND_SERVICE"],
      ReadonlyRootfs: false,
      Tmpfs: { "/tmp": "rw,noexec,nosuid,size=128m" },
    },
    portDetection: {
      patterns: [/listening.*?:(\d{4,5})/i, /port\s+(\d{4,5})/i, /localhost:(\d{4,5})/i],
      commonPorts: [3000, 5000, 5173, 8080],
    },
    healthCheck: "echo ok",
    cleanupCommands: ["rm -rf /tmp/*"],
  },
};

/**
 * Get container configuration for a given runtime.
 * @param {"node"|"python"|"generic"} runtime
 * @returns {Object}
 */
export function getRuntimeConfig(runtime) {
  return RUNTIME_CONTAINERS[runtime] || RUNTIME_CONTAINERS.generic;
}

/**
 * Get security options for container creation HostConfig.
 * @param {"node"|"python"|"generic"} runtime
 * @returns {Object}
 */
export function getSecurityConfig(runtime) {
  const config = getRuntimeConfig(runtime);
  return config.securityOptions;
}

/**
 * Get resource limits for container creation HostConfig.
 * @param {"node"|"python"|"generic"} runtime
 * @returns {Object}
 */
export function getResourceLimits(runtime) {
  const config = getRuntimeConfig(runtime);
  return {
    Memory: config.resourceLimits.memory,
    NanoCpus: config.resourceLimits.nanoCpus,
    PidsLimit: config.resourceLimits.pidsLimit,
  };
}

/**
 * Get timeout for a specific operation.
 * @param {"node"|"python"|"generic"} runtime
 * @param {"command"|"install"|"build"|"server"|"kernelExec"} operation
 * @returns {number} Timeout in milliseconds
 */
export function getTimeout(runtime, operation) {
  const config = getRuntimeConfig(runtime);
  return config.timeouts[operation] || config.timeouts.command;
}

export default RUNTIME_CONTAINERS;

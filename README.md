# CloudForge: Cloud-Native Collaborative Development Workspace

## 1. Introduction

CloudForge is a cloud-native, browser-based collaborative development platform designed to provide a complete software development environment without requiring extensive local configuration. It combines a browser-based IDE, isolated containerized workspaces, real-time collaboration, Git integration, cloud terminal access, and resource monitoring within a unified platform. 

Docker provides isolated and consistent development environments, while cloud-native orchestration supports scalable workspace management. The platform is designed for developers, educational institutions, and engineering teams that require accessible, standardized, and collaborative development environments without local machine configuration overhead.

---

## 2. Problem Statement

Traditional development environments require developers to install and configure programming languages, libraries, frameworks, IDEs, compilers, databases, and other dependencies locally. Differences in operating systems, hardware architectures, package versions, and environment variables frequently lead to dependency conflicts and inconsistent execution environments. Collaborative development also requires developers to switch between disparate tools for coding, version control, communication, terminal operations, execution, and deployment.

Existing cloud-based development solutions address several of these problems, but critical capabilities are often fragmented across separate systems. Collaborative editors primarily focus on concurrent text editing, container tools focus on environment isolation, and cloud IDE platforms focus on remote development. There is a need for a unified platform that combines isolated cloud workspaces, hierarchical file exploration, visual Git commit timelines, code execution, terminal access, and resource management into a single cohesive environment.

---

## 3. Objectives

* Develop a browser-based development environment accessible across diverse client devices and operating systems.
* Provide isolated, reproducible development workspaces using containerization principles.
* Eliminate dependency conflicts and machine-specific configuration discrepancies across developer environments.
* Enable seamless workspace navigation with a full-featured hierarchical file explorer and multi-tab code editor.
* Integrate visual Git operations directly into the development environment, including branch management, working tree diffing, commit history graphs, and GitHub synchronization.
* Provide a browser-accessible cloud terminal for workspace operations and task management.
* Monitor workspace resource consumption, including CPU, memory, storage, and active processes.
* Provide persistent project workspaces with reliable multi-file hierarchy and metadata persistence.
* Design the platform using scalable cloud-native principles such as container orchestration, load balancing, caching, asynchronous processing, and automated deployment.

---

## 4. Key Features

| Feature | Description |
| :--- | :--- |
| Browser-Based IDE | Web-based coding environment with multi-tab navigation, line numbers gutter, syntax formatting, in-editor search, dynamic font scaling, and word wrap. |
| Hierarchical File Explorer | Multi-level tree navigation with collapsible folders, extension-aware syntax icons, in-place file/folder renaming, recursive deletion, and multi-file uploads. |
| Source Control & Staging | Git working tree state management separating staged and unstaged changes, with modification badges (A, M, D) and stage/unstage/discard actions. |
| Visual Commit Timeline | VS Code-style commit timeline graph displaying author metadata, commit hashes, timestamps, and an interactive commit diff viewer. |
| Side-by-Side & Unified Diff | Comprehensive diff inspection tool displaying additions and deletions with colored inline highlighting. |
| GitHub Remote Integration | Direct integration with GitHub REST API v3 to link existing repositories, publish new repositories, and perform bidirectional synchronization. |
| Template Presets | Pre-configured starter templates for React + TypeScript, Node.js Express, Python App, HTML/CSS/JS, and Blank projects with in-place re-seeding. |
| Project Export as ZIP | Client-side archive bundling allowing users to download their entire workspace as a structured ZIP file. |
| Containerized Terminal | Integrated browser terminal shell supporting command execution, Git logs, status inspection, and operational monitoring. |
| Resource Monitoring | Visibility into CPU, memory, storage, and container health metrics. |
| Persistent Storage | Preserves project directory structures, file contents, and commit history across workspace sessions. |

---

## 5. Literature Review

The paradigm of software development environments has undergone significant evolution over the past decade, transitioning from isolated local desktop IDEs toward cloud-native, containerized, and collaborative development workspaces. To establish a rigorous theoretical and empirical foundation for **CloudForge**, this literature review analyzes ten landmark research publications (`RP_1` to `RP_10`) spanning container orchestration, cloud development environments (CDEs), synchronous/asynchronous collaborative programming, and DevOps version-control integration.

### 5.1 Comparative Summary of Reviewed Research Papers

| # | Research Paper & Authors | Year & Venue | Core Contribution & Methodology | Critical Limitations & Identified Gaps |
| :---: | :--- | :---: | :--- | :--- |
| **RP 1** | **Leveraging Container Orchestration with Docker and Kubernetes for Web-Based Integrated Development Environments (IDEs)**<br>*Y. Tayyebi, K. S. Rohilla, K. Dutta, N. Chouhan, M. Rathore, J. Sharma, K. Raikwar* | 2025<br>PIEMR / J. Comp. Sci. | Investigated microservices-based web IDE architecture utilizing Docker container isolation and Kubernetes horizontal pod autoscaling (HPA) for multi-tenant developer isolation. | Focuses primarily on backend cluster orchestration without providing integrated visual Git staging, interactive diff inspection, or lightweight zero-install client workspace persistence. |
| **RP 2** | **Real Time Code Collaborator: A Cloud-Based Platform for Seamless Multi-User Programming**<br>*S. T. S., S. M, S. G, S. G, Y. S. L* | 2025<br>IJARCCE (Vol. 14, Iss. 12)<br>`10.17148/IJARCCE.2025.141276` | Developed a full-stack real-time code collaborator (RTCC) using WebSockets for sub-second edit synchronization and Docker execution sandboxes with embedded audio/chat. | Tailored specifically for transient coding interviews and pair sessions; lacks persistent project directory hierarchies, commit graphs, and bidirectional GitHub repository synchronization. |
| **RP 3** | **Cloud vs. Local Development Stacks: Leveraging CDE and PaaS Platforms for Academic Web Development Labs**<br>*R. I. Zuhairnawan, U. Y. K. S. Hediyanto, M. Fathinuddin* | 2026<br>e-Proc. of Engineering (Vol. 13, No. 1) | Conducted empirical benchmarking of four commercial/open-source CDEs (Codespaces, CodeSandbox, Devspace, DevZero) and four PaaS systems (Render, Koyeb, Northflank, Lade) for booting time, latency, and resource footprint. | Evaluates existing third-party platforms without offering a unified, lightweight standalone architecture that consolidates visual version control, template switching, and browser terminal management. |
| **RP 4** | **Creating a Standardized Environment for Efficient Learning Management using GitHub Codespaces and GitHub Classroom**<br>*A. D. Snowberger, K. You* | 2024<br>J. Pract. Eng. Educ. (Vol. 16, No. 3)<br>`10.14702/JPEE.2024.267` | Demonstrated containerized devcontainer workflows in educational computer science labs to eliminate local setup friction, eliminate configuration drift, and standardize assignment grading. | Highly dependent on proprietary Microsoft/GitHub ecosystem quotas and heavy VM backends; requires non-trivial devcontainer configuration files and lacks customizable lightweight web hosting. |
| **RP 5** | **CoVSCode: A Novel Real-Time Collaborative Programming Environment for Lightweight IDE**<br>*H. Fan, K. Li, X. Li, T. Song, W. Zhang, Y. Shi, B. Du* | 2019<br>Applied Sciences (MDPI, Vol. 9, Iss. 21)<br>`10.3390/app9214611` | Designed an Operational Transformation (OT) and distributed state consistency extension for Visual Studio Code, enabling multi-cursor tracking and simultaneous buffer editing. | Confined strictly to desktop VS Code installations requiring pre-installed client software; lacks zero-install browser access, containerized remote runtime execution, and cloud document storage. |
| **RP 6** | **The Impact of Docker, DevOps, and GitHub on Collaborative Open Source Software Development**<br>*P. S. Emmanni* | 2023<br>EJAET (Vol. 10, Iss. 8) | Empirically analyzed the synergy between Docker containers, automated CI/CD pipelines, and GitHub distributed version control in accelerating developer onboarding and code review quality. | Qualitative and empirical analysis of development methodologies without proposing an integrated software architecture or embedding visual Git workflows directly within a browser IDE. |
| **RP 7** | **ATCoPE: Any-Time Collaborative Programming Environment for Seamless Integration of Real-Time and Non-Real-Time Teamwork**<br>*H. Fan, C. Sun, H. Shen* | 2012<br>ACM GROUP 2012<br>`10.1145/2389176.2389193` | Formulated the theoretical framework for "Any-Time Collaborative Programming", unifying synchronous pair programming with asynchronous branch-based version control systems (VCS). | Concentrates on concurrency algorithms and text-buffer synchronization models; lacks modern web container execution, RESTful GitHub integration, interactive diff UI, and cloud terminal access. |
| **RP 8** | **Building Temporary Isolated Workspace in Real-Time Collaborative Programming Environment**<br>*J. Jiang, Y. Xie, B. Fang, M. Wang, H. Fan* | 2023<br>IEEE SMC / CollaborateCom | Proposed the RECON (Reversion of Error-free Code with Workspace Isolation) model to isolate broken intermediate code into temporary sandboxes so collaborators can compile and test unhindered. | Restricted to buffer-level syntactic isolation; does not address end-to-end cloud workspace persistence, multi-file project lifecycle management, remote Git hosting, or full terminal virtualization. |
| **RP 9** | **DoCloud: An Elastic Cloud Platform for Web Applications Based on Docker**<br>*C. Kan* | 2016<br>IEEE ICACT 2016<br>`10.1109/ICACT.2016.7423440` | Architected an elastic cloud hosting platform leveraging lightweight Docker containers with hybrid reactive threshold-based and predictive ARMA scaling algorithms. | Tailored exclusively for backend application deployment and server autoscaling; lacks an interactive developer-facing IDE interface, client code editor, file explorer, or source control tooling. |
| **RP 10** | **ChainIDE: A Cloud-Based Integrated Development Environment for Cross-Blockchain Smart Contracts**<br>*H. Qiu, X. Wu, S. Zhang, V. C. M. Leung, W. Cai* | 2020<br>IEEE/ACM Blockchain | Designed a multi-ecosystem cloud IDE featuring zero-configuration cloud compilation, asynchronous compiler microservices, dynamic project templates, and web-based workspace virtualization. | Domain-specific for smart contract compilation and blockchain deployment; lacks generic full-stack software development workflows, interactive local Git staging/diffing, and bidirectional GitHub sync. |

---

### 5.2 Thematic Synthesis & Detailed Paper Analysis

#### Theme A: Cloud Container Orchestration & Elastic Web IDE Architectures (RP 1, RP 9, RP 10)
* **Container-Native Scaling**: Tayyebi et al. (**RP 1**) and Kan (**RP 9**) demonstrated that containerization via Docker drastically minimizes the virtualization overhead traditionally associated with hypervisor-based Virtual Machines (VMs). By sharing the host OS kernel, containers enable rapid instantiation (<2 seconds) and elastic resource scaling through predictive (ARMA) and reactive threshold algorithms.
* **Domain-Specific Cloud Virtualization**: Qiu et al. (**RP 10**) highlighted the effectiveness of offloading compilation and build pipelines to cloud microservices through ChainIDE, establishing that zero-configuration web environments dramatically lower developer barrier-to-entry.
* **Architectural Shortcoming**: While these systems provide robust backend isolation and elastic compute scaling, they treat the developer interface as a thin execution portal, neglecting deep client-side developer tooling such as interactive visual branch switching, commit diff graphs, in-browser terminal interaction, and full multi-file project hierarchies.

#### Theme B: Collaborative Programming & Workspace State Isolation (RP 2, RP 5, RP 7, RP 8)
* **Real-Time Synchronous Concurrency**: Shruthi et al. (**RP 2**) and Fan et al. (**RP 5**) explored WebSocket communication and Operational Transformation (OT) to achieve sub-second multi-user document synchrony.
* **Bridging Synchronous & Asynchronous Paradigms**: Fan et al. (**RP 7**) identified that synchronous pair-programming and asynchronous version-controlled branching are complementary rather than mutually exclusive. Jiang et al. (**RP 8**) further advanced this by proposing RECON to isolate broken intermediate code into sandbox buffers, preventing build breakages among co-developers.
* **Architectural Shortcoming**: These collaborative systems operate primarily at the in-memory text buffer level. They lack end-to-end workspace lifecycle management, hierarchical directory trees, persistent document schemas, visual staging areas (Staged vs. Unstaged changes), and bi-directional synchronization with remote version control providers (GitHub REST API).

#### Theme C: Cloud Development Environments (CDEs), DevOps & Standardized Labs (RP 3, RP 4, RP 6)
* **Overcoming Configuration Drift**: Zuhairnawan et al. (**RP 3**) and Snowberger & You (**RP 4**) demonstrated that local machine disparities create severe friction ("works on my machine" syndrome), particularly in educational and engineering team settings. Containerized CDEs (e.g., GitHub Codespaces) resolve this by standardizing operating systems, libraries, and compiler toolchains.
* **DevOps Synergy**: Emmanni (**RP 6**) showed that uniting containerization with distributed version control (GitHub) and CI/CD pipelines significantly shortens development feedback loops and enhances software quality.
* **Architectural Shortcoming**: Existing commercial CDEs (Codespaces, Gitpod) rely on resource-heavy VM provisioning, proprietary cloud ecosystems, high subscription costs, and complex devcontainer configuration files. There remains a critical need for an independent, lightweight, browser-accessible cloud IDE that combines full visual Git source control, instant template seeding, client-side ZIP exports, and terminal monitoring into a unified platform.

---

## 6. Research Gap Analysis

While prior literature has extensively explored isolated facets of cloud computing, collaborative editing, and container orchestration, significant architectural and functional gaps persist when attempting to deliver a cohesive, zero-configuration cloud development environment.

### 6.1 Dimensional Research Gap Comparison

```
+---------------------------------------------------------------------------------------------------+
|                                 STATE OF THE ART RESEARCH GAPS                                    |
+------------------------------------+----------------------------------+---------------------------+
| Research Dimension                 | Existing Literature              | CloudForge Approach       |
+------------------------------------+----------------------------------+---------------------------+
| 1. Version Control Integration     | CLI-only / External Web UI       | Embedded Visual Git Graph |
| 2. Development Setup Overhead      | Heavy Devcontainers / VM Quotas  | Zero-Install Browser IDE  |
| 3. Buffer vs. Workspace Lifecycle  | In-memory Ephemeral Buffers      | Full MongoDB Tree Schema  |
| 4. Diff & Change Inspection        | Basic Text Differences           | Side-by-Side Unified Diff |
| 5. Project Starter & Re-seeding    | Static Single Repositories       | In-Place Template Switch  |
| 6. Remote Repository Interop       | One-way Clones / Manual Pulls    | Bidirectional GitHub REST |
+------------------------------------+----------------------------------+---------------------------+
```

| Identified Research Gap Dimension | Prior State-of-the-Art (Literature References) | Limitations in Existing Work | CloudForge Integrated Solution |
| :--- | :--- | :--- | :--- |
| **1. Fragmentation Between Web IDEs and Visual Git Version Control** | RP 1 (Tayyebi et al.), RP 6 (Emmanni), RP 10 (Qiu et al.) | Cloud IDEs either omit version control or force developers to switch to external web tabs or complex CLI commands. | Directly embeds a visual Git source control panel featuring staged/unstaged change tracking, modification badges (A, M, D), commit history graphs, and interactive commit diff modals. |
| **2. Heavyweight Resource Footprint & Vendor Lock-In of Commercial CDEs** | RP 3 (Zuhairnawan et al.), RP 4 (Snowberger & You) | Commercial CDEs (Codespaces, Gitpod) require high cloud credits, heavy VM startup times (>30s), and complex devcontainer specs. | Delivers a lightweight, instant-boot web IDE (React 19 + Vite) backed by Node.js/Express and MongoDB, offering complete workspace accessibility across low-spec client hardware. |
| **3. In-Memory Ephemeral Buffers vs. Persistent Multi-File Hierarchy** | RP 2 (Shruthi et al.), RP 5 (Fan et al.), RP 8 (Jiang et al.) | Collaborative coding platforms focus on transient, single-buffer editing sessions without persistent directory trees. | Implements a robust multi-level hierarchical File Explorer with extension-aware icons, recursive deletion, in-place renaming, folder creation, and multi-file drag-and-drop upload. |
| **4. Inadequate Inline & Side-by-Side Diff Inspection** | RP 7 (Fan et al.), RP 8 (Jiang et al.) | Theoretical collaborative models lack interactive visual tools for inspecting working-tree changes prior to commit. | Provides an integrated Side-by-Side and Unified Diff Viewer displaying additions and deletions with syntax-aware line highlighting and split/unified viewing modes. |
| **5. Lack of Dynamic Template Switching & Workspace Re-Seeding** | RP 4 (Snowberger & You), RP 10 (Qiu et al.) | Workspace initialization is static; switching project stacks requires tearing down and recreating entire cloud instances. | Features an in-place Starter Template Engine supporting dynamic switching between React+TS, Node.js Express, Python App, HTML/CSS/JS, and Blank presets with automatic commit generation. |
| **6. Disconnect Between Cloud Workspaces and Remote Git Ecosystems** | RP 2 (Shruthi et al.), RP 6 (Emmanni), RP 7 (Fan et al.) | Web IDEs operate in isolated silos without native API-level synchronization with developers' existing remote code repositories. | Implements direct bidirectional GitHub REST API v3 integration enabling users to link existing GitHub repos, publish fresh repositories, and sync commits directly from the workspace. |

---

### 6.2 Deep-Dive into Core Research Gaps

#### 1. The Version Control & Staging Interface Gap
Existing web IDE research frequently treats version control as a backend artifact rather than a core visual interaction paradigm. Developers using traditional web IDEs must rely on terminal CLI commands (`git add`, `git diff`, `git commit`), which have a steep learning curve and lack visual feedback. **CloudForge** closes this gap by providing an interactive Source Control dock with selective file staging/unstaging, discard functionality, visual status pills, commit message authoring, and a graphical commit timeline graph.

#### 2. The Granular Workspace Persistence & Export Gap
Most collaborative research prototypes (e.g., RTCC, CoVSCode) maintain state in volatile memory or single flat files, making them unsuitable for real-world full-stack multi-file projects. **CloudForge** introduces a schema-backed persistence model where directory trees, file contents, language associations, and commit histories are persistently stored in MongoDB, while providing instant client-side ZIP archive bundling (`JSZip`) for offline portability.

#### 3. The Unified Cloud-Native Development Lifecycle Gap
The primary overarching research gap identified across all ten papers is the **absence of a unified, lightweight cloud-native development platform that seamlessly integrates browser coding, multi-tab editing, hierarchical file exploration, visual version control, template presets, cloud terminal monitoring, and bidirectional GitHub remote repository synchronization within a single cohesive workflow**. CloudForge directly addresses this overarching gap by delivering an end-to-end cloud-native developer workspace.

---

## 7. System Architecture

```mermaid
flowchart TD
  subgraph Client ["Client Tier: React 19 + TypeScript + Vite"]
    UI["CloudForge Workspace Interface"]
    ActivityBar["Activity Bar Dock"]
    FileExplorer["Hierarchical File Explorer"]
    SourceControl["Source Control & Commits Graph"]
    Editor["Multi-Tab Code Editor"]
    DiffViewer["Side-by-Side & Unified Diff Viewer"]
    TerminalPanel["Terminal & Git Operational Log Panel"]
  end

  subgraph Gateway ["Application Server Tier: Express.js"]
    AuthMW["JWT & Cookie Authentication Middleware"]
    ProjectController["Project Controller"]
    WorkspaceController["Workspace Controller"]
    GitHubService["GitHub REST API Service (Octokit / REST v3)"]
    TemplateService["Starter Template Engine"]
  end

  subgraph Storage ["Persistence Tier: MongoDB"]
    UserSchema[("Users & Credentials")]
    ProjectSchema[("Projects & Metadata")]
    ProjectFileSchema[("Project Files & Tree Nodes")]
    ProjectCommitSchema[("Project Commits & Diff Patches")]
    GitHubConnSchema[("GitHub OAuth Tokens")]
  end

  subgraph External ["External Services Tier"]
    GitHubAPI["GitHub REST API v3"]
    UserRepositories["Remote User Repositories"]
  end

  UI --> ActivityBar
  ActivityBar --> FileExplorer
  ActivityBar --> SourceControl
  UI --> Editor
  UI --> DiffViewer
  UI --> TerminalPanel

  FileExplorer -->|File CRUD & Uploads| WorkspaceController
  SourceControl -->|Commit / Stage / Branch| WorkspaceController
  Editor -->|Save File (Ctrl+S)| WorkspaceController
  TerminalPanel -->|Terminal Commands| WorkspaceController

  WorkspaceController --> AuthMW
  ProjectController --> AuthMW

  WorkspaceController --> ProjectFileSchema
  WorkspaceController --> ProjectCommitSchema
  WorkspaceController --> ProjectSchema
  ProjectController --> ProjectSchema
  AuthMW --> UserSchema
  AuthMW --> GitHubConnSchema

  WorkspaceController <--> GitHubService
  WorkspaceController <--> TemplateService
  GitHubService <--> GitHubAPI
  GitHubAPI <--> UserRepositories
```

---

## 8. Development Methodology & Process Model

CloudForge follows an iterative, systematic engineering methodology:

```mermaid
flowchart LR
  Step1["1. Requirement Analysis"] --> Step2["2. System Architecture Design"]
  Step2 --> Step3["3. Workspace Provisioning Engine"]
  Step3 --> Step4["4. File Hierarchy & Editor System"]
  Step4 --> Step5["5. Git Engine & Staging Area"]
  Step5 --> Step6["6. Diff Viewer & Commit Timeline"]
  Step6 --> Step7["7. GitHub API Synchronization"]
  Step7 --> Step8["8. Template Presets & Export"]
  Step8 --> Step9["9. Verification & Performance Tuning"]
```

| Step | Phase | Key Implementation Details |
| :---: | :--- | :--- |
| **1** | **Requirement Analysis** | Analyzed developer requirements for browser-based coding, workspace file persistence, visual Git workflows, and cloud portability. |
| **2** | **System Architecture Design** | Architected decoupled client-server architecture with stateless Express REST endpoints and MongoDB Mongoose schemas. |
| **3** | **Workspace Provisioning Engine** | Implemented isolated workspace initialization, container management, and project lifecycle controls. |
| **4** | **File Hierarchy & Editor System** | Built expandable/collapsible file tree, syntax icons, in-place file/folder renaming, recursive deletion, multi-file uploads, and multi-tab editor. |
| **5** | **Git Engine & Staging Area** | Developed working tree dirty-state tracking, staged vs unstaged separation, commit creation, and branch management. |
| **6** | **Diff Viewer & Commit Timeline** | Engineered side-by-side (split) and unified diff views with addition/deletion line highlighting and interactive commit inspection. |
| **7** | **GitHub API Synchronization** | Implemented bidirectional GitHub REST API integration for repository linking, publishing, recursive tree pulling, and remote committing. |
| **8** | **Template Presets & Export** | Built modular starter templates (React, Node.js, Python, HTML/CSS, Blank) with re-seeding and client-side ZIP archive export via JSZip. |
| **9** | **Verification & Performance Tuning** | Conducted strict TypeScript validation (`tsc -b`), production bundling (`vite build`), and backend syntax verification. |

---

## 9. Implementation Roadmap

| Phase | Module | Description |
| :--- | :--- | :--- |
| **Phase 1** | **React + Node.js + MongoDB** | Set up the frontend, backend APIs, authentication, database schemas, and foundational application architecture. |
| **Phase 2** | **Project Management** | Implement project creation, workspace management, user sessions, permissions, and project settings. |
| **Phase 3** | **Docker Workspace** | Create isolated Docker-based development environments for each project. |
| **Phase 4** | **Cloud Terminal** | Provide an interactive terminal connected to the user's isolated workspace. |
| **Phase 5** | **Browser IDE** | Build a web-based code editor with file explorer, multi-tab editing, line numbers gutter, and workspace integration. |
| **Phase 6** | **Git Integration** | Add Git repository operations, working tree diffing, commit history graph, branch switcher, and GitHub sync. |
| **Phase 7** | **WebSocket Collaboration** | Enable real-time communication and collaborative workspace synchronization using WebSockets. |
| **Phase 8** | **Resource Monitoring** | Monitor CPU, memory, storage, container health, and workspace resource usage. |
| **Phase 9** | **Redis + Message Queue** | Introduce Redis for caching, session management, coordination, and message queues for asynchronous workloads. |
| **Phase 10** | **Persistent / Object Storage** | Add persistent storage for project files, build artifacts, logs, and workspace archives. |
| **Phase 11** | **Kubernetes** | Migrate workspace orchestration from standalone Docker containers to Kubernetes-managed workloads. |
| **Phase 12** | **Auto Scaling + Load Balancing** | Implement automatic resource scaling and load balancing to support concurrent developer workloads. |
| **Phase 13** | **Monitoring + CI/CD** | Integrate centralized monitoring, logging, metrics, automated testing, and CI/CD pipelines for production deployment. |

---

## 10. Technical Specifications & REST API Reference

### Workspace & File Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/projects/:id/workspace` | Unified fetch for project metadata, files, commits, and branches in a single query. |
| `GET` | `/api/projects/:id/files` | Fetch flat list of workspace file and directory documents. |
| `POST` | `/api/projects/:id/files` | Create a new file or directory in the workspace. |
| `PUT` | `/api/projects/:id/files/:fileId` | Update file content, name, or path. |
| `PUT` | `/api/projects/:id/files/:fileId/rename` | Rename file or folder (recursively updates paths of all child items). |
| `DELETE` | `/api/projects/:id/files/:fileId` | Delete file or directory (recursively deletes all child items). |
| `POST` | `/api/projects/:id/workspace/reset-template` | Re-seed workspace files from a selected starter template. |

### Git & Source Control Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/projects/:id/git/commits` | Get commit history timeline for the active branch. |
| `GET` | `/api/projects/:id/git/commits/:sha` | Get single commit details, file changes, and diff patches. |
| `POST` | `/api/projects/:id/git/commit` | Create a new commit locally and/or push to remote GitHub repository. |
| `POST` | `/api/projects/:id/git/branches` | Switch active branch or create a new branch. |
| `POST` | `/api/projects/:id/git/link-github` | Link local project to an existing GitHub repository URL. |
| `POST` | `/api/projects/:id/git/publish-github` | Create a new GitHub repository and push all local workspace files. |
| `POST` | `/api/projects/:id/git/sync` | Synchronize workspace with the remote GitHub repository tree. |

---

## 11. Directory Layout

```text
CloudForge/
├── Backend/
│   ├── src/
│   │   ├── config/             # Database and GitHub OAuth configurations
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   ├── workspaceController.js   # File CRUD, Git commits, GitHub sync, Template re-seed
│   │   │   └── githubController.js
│   │   ├── middleware/         # Auth verification middleware
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Project.js               # Clean project schema (name, description, template, gitRemote)
│   │   │   ├── ProjectFile.js           # Multi-file tree schema
│   │   │   ├── ProjectCommit.js         # Git commit history & diff patch schema
│   │   │   └── GitHubConnection.js
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # GitHub REST API & starter template engine
│   │   └── server.js           # Express application entry
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Navbar and global layouts
│   │   │   ├── projects/       # Project cards, creation modal, and repository picker
│   │   │   ├── ui/             # LoadingSpinner, EmptyState
│   │   │   └── workspace/      # VS Code-grade Workspace Components
│   │   │       ├── ActivityBar.tsx
│   │   │       ├── BottomPanel.tsx
│   │   │       ├── CodeEditor.tsx
│   │   │       ├── CommitDetailsModal.tsx
│   │   │       ├── DiffViewer.tsx
│   │   │       ├── FileExplorer.tsx
│   │   │       ├── FileIcon.tsx
│   │   │       ├── GitHubRemoteModal.tsx
│   │   │       ├── ProjectSettingsPanel.tsx
│   │   │       ├── SearchPanel.tsx
│   │   │       ├── SourceControlPanel.tsx
│   │   │       ├── StatusBar.tsx
│   │   │       └── WorkspaceNavbar.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Project.tsx     # Projects list overview
│   │   │   └── ProjectView.tsx # Main IDE Workspace
│   │   ├── types/              # TypeScript definitions (project.ts, workspace.ts)
│   │   └── main.tsx
│   └── package.json
│
└── README.md
```

---

## 12. Installation & Setup Guide

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm** or **yarn**
* **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster connection

### 1. Backend Setup
```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend/` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cloudforge
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/github/callback
```

Start the backend server:
```bash
npm run dev
```

### 2. Frontend Setup
```bash
cd ../Frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

Navigate to `http://localhost:5173` in your browser.

---

## 13. License

This project is licensed under the MIT License.
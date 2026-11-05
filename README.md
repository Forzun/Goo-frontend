# LocalGoo

> **[!NOTE]**
> Please note that this project is under development but you can use it anyways 

A local-first AI workspace that keeps your projects, conversations, and memory on your machine.

Bring your own models, connect your own workspace, and let AI work with your project context. LocalGoo combines a browser-based workspace with local LLMs powered by Ollama, persistent conversation memory, and semantic search.

**Your workspace. Your models. Your data.**

[![Typing SVG](https://readme-typing-svg.herokuapp.com?font=&size=33&letterSpacing=large&pause=1000&color=8373F7&center=true&vCenter=true&width=1000&lines=LocalGoo;your+private+%2C+local+first+AI+coding+assistant)](https://git.io/typing-svg)

![LocalGoo](./.github/assets/preview.png)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/)
- [Ollama](https://ollama.com/)
- A supported browser with File System Access API support.

### Installation

## Quick Installation use Docker (recomended)

Build the Docker image:

```bash
docker build -t localgoo .
```

Run the container:

```bash
docker run -d \
  --name Local \
  -p 3000:3000 \
  localgoo
```

Clone the repository:

```bash
git clone https://github.com/your-username/localgoo.git
cd localgoo
```

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun dev
```

Open `http://localhost:3000` in your browser.

### Set Up Ollama

Make sure Ollama is running locally:

```bash
ollama serve
```

Pull a model:

```bash
ollama pull llama3.1
```

For semantic memory search, pull an embedding model:

```bash
ollama pull nomic-embed-text
```

Configure LocalGoo to use your preferred models.

## How It Works

LocalGoo uses a workspace-based architecture.

<!-- add image of architecture -->

```text
LocalGoo/
├── user.md
├── daily/
├── projects/
│   └── project-name/
│       ├── memory.md
│       ├── conversations/
│       └── files/
└── .localgoo/
    ├── config.json
    └── localgoo.db
```
## 🤝 Contributing

Contributions, ideas, and feedback are welcome!

If you're interested in building a more personal and local-first AI experience, feel free to contribute.

## 📄 License

Add your project's chosen open-source license here.
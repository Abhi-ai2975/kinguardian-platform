# Contributing to AI Platform

Thank you for your interest in contributing to the AI Platform! This document provides guidelines and instructions for setting up the repository on your local system.

## Getting Started

### Prerequisites

Before you begin, make sure you have the following installed on your system:

- **Python 3.8 or higher**: Download from [python.org](https://www.python.org/downloads/)
- **Git**: Download from [git-scm.com](https://git-scm.com/)
- **uv**: A fast Python package manager. Install with:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
  Or on Windows:
  ```powershell
  powershell -ExecutionPolicy BypassUser -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```
  Or via pip/conda:
  ```bash
  pip install uv
  # or
  conda install -c conda-forge uv
  ```

### Step 1: Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/alphaesAI/aiplatform.git
cd aiplatform
```

If the repository has git submodules (such as the `src/txtai` submodule), initialize them:

```bash
git submodule update --init --recursive
```

### Step 2: Install Dependencies with uv

The project uses `uv` for fast and reliable dependency management. Install all dependencies in one command:

```bash
uv sync
```

This will:
- Create a virtual environment automatically (if one doesn't exist)
- Install all project dependencies
- Create a `uv.lock` file for reproducible builds

**Optional**: To install development dependencies as well:
```bash
uv sync --all-extras
```

### Step 3: Activate the Virtual Environment (Optional)

If you want to manually activate the virtual environment created by `uv`:

```bash
# On macOS/Linux:
source .venv/bin/activate

# On Windows:
.venv\Scripts\activate
```

However, you can also run commands directly with `uv`:
```bash
uv run python --version
uv run pytest tests/
```

### Step 4: Verify Installation

To verify that everything is set up correctly, you can run the test suite:

```bash
# Using uv directly (recommended)
uv run pytest tests/

# Or if you've activated the venv
pytest tests/
```

## Project Structure

The AI Platform consists of several key components:

- **`src/custom/`**: Core ETL framework including:
  - `connectors/`: Data source connections (Arxiv, Elasticsearch, Gmail, OpenSearch, RDBMS)
  - `credentials/`: Credential management
  - `extractors/`: Data extraction logic
  - `loaders/`: Data loading to target systems
  - `transformers/`: Data transformation pipeline
  - `utils/`: Helper utilities

- **`src/txtai/`**: Git submodule for txtai (AI framework for semantic search and embeddings)

- **`dags/`**: Apache Airflow DAGs for orchestrating data pipelines
  - `structure/health/`: PostgreSQL to Elasticsearch pipeline
  - `unstructure/gmail/`: Gmail data extraction and processing
  - `unstructure/arxiv/`: Arxiv metadata and PDF processing

- **`tests/`**: Unit tests for custom framework components

## Development Workflow

### Making Changes

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test them thoroughly

3. Run tests to ensure nothing is broken:
   ```bash
   uv run pytest tests/ -v
   ```

### Committing Your Work

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "Add feature: description of your changes"
```

### Pushing and Creating a Pull Request

Push your branch to GitHub:

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with a clear description of your changes.

## Dependencies

The project uses the following key dependencies:

- **Apache Airflow**: Data pipeline orchestration
- **Elasticsearch/OpenSearch**: Search and analytics engine
- **txtai**: AI framework for semantic search and embeddings
- **pytest**: Testing framework
- **requests**: HTTP client library

For a complete list, see `pyproject.toml` and `uv.lock`.

## Common uv Commands

### Installing Dependencies
```bash
# Install all dependencies
uv sync

# Install with development dependencies
uv sync --all-extras

# Sync and update lock file
uv sync --upgrade
```

### Running Commands
```bash
# Run a Python script
uv run python script.py

# Run pytest
uv run pytest tests/

# Run with specific Python version
uv run --python 3.10 python script.py
```

### Adding New Dependencies
```bash
# Add a new package to dependencies
uv add package-name

# Add a development-only package
uv add --dev package-name

# Add with specific version
uv add package-name==1.0.0
```

### Removing Dependencies
```bash
# Remove a package
uv remove package-name
```

## Setting Up for Specific Use Cases

### Running Airflow Locally

If you want to run Apache Airflow locally:

```bash
# Initialize the Airflow database
uv run airflow db init

# Create an admin user
uv run airflow users create \
  --username admin \
  --firstname Admin \
  --lastname User \
  --role Admin \
  --email admin@example.com

# Start the Airflow webserver
uv run airflow webserver --port 8080

# Start the Airflow scheduler (in another terminal)
uv run airflow scheduler
```

The Airflow web UI will be available at `http://localhost:8080`

### Running Tests

Execute the test suite:

```bash
# Run all tests
uv run pytest tests/

# Run tests with verbose output
uv run pytest tests/ -v

# Run specific test file
uv run pytest tests/test_specific.py

# Run tests with coverage report
uv run pytest --cov=src tests/
```

## Configuration

The platform uses YAML configuration files for data pipelines. Configuration files are typically located in:

- `dags/structure/health/config/`: Configuration for structured data pipelines
- `dags/unstructure/*/config/`: Configuration for unstructured data pipelines

Modify these files according to your data sources and target systems.

## Troubleshooting

### Common Issues

**1. uv command not found:**
```bash
# Make sure uv is in your PATH
uv --version

# If not installed, install it:
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**2. Virtual environment issues:**
```bash
# Remove the old environment and resync
rm -rf .venv
uv sync
```

**3. Lock file conflicts:**
```bash
# Update lock file with latest compatible versions
uv sync --upgrade
```

**4. Import errors after installation:**
```bash
# Reinstall all dependencies
uv sync --force-reinstall
```

**5. Submodule issues:**
```bash
# Ensure submodules are initialized
git submodule update --init --recursive
```

**6. Airflow errors:**
```bash
# Reset Airflow database
rm ~/airflow/airflow.db
uv run airflow db init
```

## Code Standards

- Follow PEP 8 style guidelines for Python code
- Write meaningful variable and function names
- Add docstrings to functions and classes
- Include type hints where applicable
- Write unit tests for new functionality

### Running Code Quality Tools

```bash
# Format code with black
uv run black src/ tests/

# Sort imports with isort
uv run isort src/ tests/

# Check code style with flake8
uv run flake8 src/ tests/

# Type checking with mypy
uv run mypy src/
```

## Getting Help

If you encounter issues or have questions:

1. Check the existing GitHub issues
2. Review the README.md for project overview
3. Check the documentation in the `docs/` directory
4. Open a new GitHub issue with detailed information
5. Check the [uv documentation](https://docs.astral.sh/uv/)

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License. See the LICENSE file for details.

Thank you for contributing to AI Platform!

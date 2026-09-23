# AI Platform

This project is a data platform designed to extract, transform, and load data from various sources into a centralized system, primarily Elasticsearch. It uses Apache Airflow to orchestrate these data pipelines and includes a custom-built framework for handling different data operations. The platform is designed to process both structured and unstructured data, with capabilities for generating semantic embeddings for advanced search and analysis.

Project Structure
~~~~~~~~~~~~~~~~~

The project is organized into several key directories:

- src/: Contains the core source code for the platform.
- dags/: Holds the Apache Airflow DAGs that define and orchestrate the data pipelines.
- tests/: Includes unit tests for the custom modules.

src/custom
~~~~~~~~~~

This directory contains a modular and extensible framework for building ETL pipelines. It is organized by functionality:

- connectors/: Manages connections to various data sources. It includes a ConnectorFactory to instantiate connectors for different services like Arxiv, Elasticsearch, Gmail, Opensearch, and RDBMS.

- credentials/: Handles credential management. It provides a CredentialFactory to retrieve credentials from different providers, with a primary implementation for AirflowCredentials which fetches credentials from Airflow's connection manager.

- extractors/: Contains the logic for extracting data from the sources defined in the connectors directory. It includes extractors for Gmail, RDBMS, and Arxiv, with a factory for easy instantiation.

- loaders/: Responsible for loading data into the target systems. It includes SingleIngestor and BulkIngestor for Elasticsearch, and integrates with txtai for generating embeddings.

- transformers/: Handles data transformation. It includes a DocumentTransformer for unstructured text and a JsonTransformer for structured data, preparing the data for loading.

- utils/: Provides utility functions for file reading (reader.py) and resilience patterns like rate limiting and retries (resilience.py).

src/txtai
~~~~~~~~

This directory contains a git submodule for txtai, an all-in-one AI framework for semantic search, LLM orchestration, and language model workflows. It is used in this project primarily for its embedding generation capabilities. For more details, refer to the README.md within that directory.

dags
~~~~

This directory contains the Airflow DAGs that orchestrate the data pipelines.

- structure/health/: A pipeline that extracts data from a PostgreSQL database, transforms it, and loads it into Elasticsearch. The pipeline is configured via YAML files in its config directory.

- unstructure/gmail/: A pipeline that extracts data from Gmail, processes the text and attachments, generates embeddings, and loads the results into Elasticsearch.

- unstructure/arxiv/: A pipeline that connects to the Arxiv API to fetch research paper metadata and PDFs.

tests
~~~~~

This directory contains unit tests for the custom framework components, ensuring the reliability of the connectors, credentials, loaders, transformers, and utils.

Key Features
~~~~~~~~~~~~

- Modular ETL Framework: The custom framework in `src/custom` is designed to be modular and easily extensible.
- Factory Patterns: The use of factory patterns allows for easy addition of new connectors, extractors, and loaders.
- Support for Structured and Unstructured Data: The platform can handle both tabular data from databases and unstructured text from sources like emails and academic papers.
- Semantic Search: Integration with `txtai` enables the generation of vector embeddings for powerful semantic search capabilities.
- Airflow Orchestration: Data pipelines are defined and managed as Airflow DAGs, providing scheduling, monitoring, and logging.
- Configuration-Driven Pipelines: The pipelines are configured using YAML files, making them easy to manage and modify without changing the core code.




source:     arxiv
            url - pdf url - parse content (arxiv id, text, meta data) - **Embedding** (jina) (arxiv id, text, meta data, vector) - elastic search

            gmail
            attachments - parse content (email id, text, meta data) - **Embedding** (txtai) (email id, text, meta data, vector) - elasticsearch

            rdbms
            postgresql - extract data - transformer - **Embeddings** - elasticsearch

search:     user query - **Embedding** (jina) - llm - agents - hybrid search - retrieve - hello + vector - elasticsearch - Ans:-

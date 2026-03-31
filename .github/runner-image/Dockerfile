# BankOffer AI — Self-Hosted Runner Image
#
# Provides a reproducible execution environment for all CI/CD workflow jobs.
# Build and push via .github/workflows/build-runner-image.yaml.
#
# Includes: Docker CLI, Python 3.11, Node.js 20, Helm 3, Terraform 1.7, curl, git.

FROM ubuntu:22.04

LABEL org.opencontainers.image.title="BankOffer AI CI Runner"
LABEL org.opencontainers.image.description="Self-hosted GitHub Actions runner with all CI/CD tooling pre-installed"
LABEL org.opencontainers.image.source="https://github.com/ptx37/BankOfferingAI"

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    NODE_MAJOR=20 \
    HELM_VERSION=v3.14.0 \
    TERRAFORM_VERSION=1.7.0

# ── System packages ───────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    git \
    unzip \
    gnupg \
    lsb-release \
    software-properties-common \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Docker CLI (so jobs can build/push images) ────────────────────────────────
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
      https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
      > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      docker-ce-cli \
      docker-buildx-plugin \
      docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# ── Python 3.11 ───────────────────────────────────────────────────────────────
RUN add-apt-repository ppa:deadsnakes/ppa -y && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      python3.11 \
      python3.11-venv \
      python3.11-dev \
      python3-pip \
    && rm -rf /var/lib/apt/lists/* && \
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 && \
    update-alternatives --install /usr/bin/python  python  /usr/bin/python3.11 1 && \
    python3 -m pip install --upgrade pip setuptools wheel

# ── Node.js 20 ────────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# ── Helm ─────────────────────────────────────────────────────────────────────
RUN curl -fsSL https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz \
      | tar -xz --strip-components=1 -C /usr/local/bin linux-amd64/helm && \
    helm version

# ── Terraform ────────────────────────────────────────────────────────────────
RUN curl -fsSL https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
      -o /tmp/terraform.zip && \
    unzip /tmp/terraform.zip -d /usr/local/bin && \
    rm /tmp/terraform.zip && \
    terraform version

# ── Common Python CI tools ───────────────────────────────────────────────────
RUN pip install --no-cache-dir ruff mypy pytest pytest-cov

# ── Common Node.js CI tools ──────────────────────────────────────────────────
RUN npm install -g @stoplight/spectral-cli

# ── Create a non-root runner user ─────────────────────────────────────────────
RUN groupadd --gid 1001 runner && \
    useradd --uid 1001 --gid runner --shell /bin/bash --create-home runner && \
    # Allow runner to use Docker socket
    usermod -aG docker runner 2>/dev/null || true

USER runner
WORKDIR /home/runner

CMD ["/bin/bash"]

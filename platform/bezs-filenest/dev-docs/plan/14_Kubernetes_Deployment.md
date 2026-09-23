# FileNest v1.0 — Kubernetes Deployment

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Cluster Topology](#1-cluster-topology)
2. [Helm Chart Structure](#2-helm-chart-structure)
3. [Service Deployments](#3-service-deployments)
4. [Autoscaling Strategy](#4-autoscaling-strategy)
5. [Secrets Management](#5-secrets-management)
6. [Networking and Ingress](#6-networking-and-ingress)
7. [Storage Configuration](#7-storage-configuration)
8. [Database in Kubernetes](#8-database-in-kubernetes)
9. [Disaster Recovery](#9-disaster-recovery)
10. [Deployment Workflow](#10-deployment-workflow)

---

## 1. Cluster Topology

### 1.1 Node Groups

```
AWS EKS Cluster: filenest-production
Region: us-east-1

Node Groups:
┌─────────────────────────────────────────────────────────┐
│ system-nodes        (m6i.large  × 3)  AZ: a,b,c        │
│  • CoreDNS, kube-proxy, metrics-server                  │
│  • taint: CriticalAddonsOnly=true:NoSchedule            │
├─────────────────────────────────────────────────────────┤
│ api-nodes           (c6i.xlarge × 3)  AZ: a,b,c        │
│  • API Gateway, Identity, Project, File services        │
│  • label: role=api                                      │
├─────────────────────────────────────────────────────────┤
│ processing-nodes    (c6i.2xlarge × 3) AZ: a,b,c        │
│  • Processing workers (CPU-heavy: OCR, virus scan)      │
│  • label: role=processing                               │
├─────────────────────────────────────────────────────────┤
│ data-nodes          (r6i.xlarge × 3)  AZ: a,b,c        │
│  • OpenSearch, NATS (memory-intensive)                  │
│  • label: role=data                                     │
├─────────────────────────────────────────────────────────┤
│ spot-nodes          (c6i.xlarge spot) AZ: a,b,c         │
│  • Processing workers overflow                          │
│  • taint: spot=true:NoSchedule                          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Namespaces

```yaml
# Namespace isolation per concern
apiVersion: v1
kind: Namespace
metadata:
  name: filenest-prod
  labels:
    environment: production
    team: platform
---
apiVersion: v1
kind: Namespace
metadata:
  name: filenest-data    # PostgreSQL, Redis, NATS, OpenSearch
---
apiVersion: v1
kind: Namespace
metadata:
  name: filenest-monitoring  # Prometheus, Grafana, Alertmanager
---
apiVersion: v1
kind: Namespace
metadata:
  name: filenest-security    # Vault Agent, cert-manager, OPA/Gatekeeper
```

---

## 2. Helm Chart Structure

```
helm/
├── Chart.yaml
├── values.yaml
├── values-staging.yaml
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── NOTES.txt
│   ├── namespace.yaml
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   └── pdb.yaml
│   ├── identity-service/
│   │   └── ... (same pattern)
│   ├── file-service/
│   │   └── ...
│   ├── processing-workers/
│   │   ├── deployment.yaml
│   │   ├── keda-scaledobject.yaml
│   │   └── pdb.yaml
│   ├── storage-service/
│   │   └── ...
│   ├── search-service/
│   │   └── ...
│   ├── webhook-service/
│   │   └── ...
│   ├── audit-service/
│   │   └── ...
│   ├── compliance-service/
│   │   └── ...
│   ├── healthcare-service/
│   │   └── ...
│   ├── ingress/
│   │   ├── ingress.yaml
│   │   └── certificate.yaml
│   ├── configmaps/
│   │   ├── app-config.yaml
│   │   └── otel-config.yaml
│   ├── rbac/
│   │   ├── service-accounts.yaml
│   │   └── roles.yaml
│   └── network-policies/
│       └── default-deny.yaml
└── charts/   # Subcharts (pinned versions)
    ├── postgresql/
    ├── redis/
    └── nats/
```

### 2.1 values.yaml

```yaml
# helm/values.yaml — base defaults

global:
  image:
    registry: 123456789.dkr.ecr.us-east-1.amazonaws.com
    pullPolicy: IfNotPresent
  environment: production
  domain: api.filenest.io

replicaCounts:
  apiGateway: 3
  identityService: 2
  projectService: 2
  fileService: 3
  storageService: 2
  searchService: 2
  webhookService: 2
  auditService: 2
  complianceService: 2
  healthcareService: 1  # Optional, disabled by default

resources:
  apiGateway:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2"
      memory: "1Gi"
  processingWorkers:
    requests:
      cpu: "1"
      memory: "2Gi"
    limits:
      cpu: "4"
      memory: "4Gi"

hpa:
  apiGateway:
    minReplicas: 3
    maxReplicas: 30
    targetCPUUtilizationPercentage: 60
    targetMemoryUtilizationPercentage: 70

autoscaling:
  processingWorkers:
    minReplicas: 3
    maxReplicas: 100
    natsLagThreshold: 50

podDisruptionBudgets:
  apiGateway:
    minAvailable: 2
  fileService:
    minAvailable: 2

ingress:
  enabled: true
  className: "nginx"
  tls:
    enabled: true
    certIssuer: "letsencrypt-prod"

postgresql:
  enabled: false  # External RDS
  externalHost: ""  # Set per environment

redis:
  enabled: false  # External ElastiCache
  externalHost: ""

nats:
  enabled: true  # Deployed in-cluster via subchart

opentelemetry:
  enabled: true
  endpoint: "http://otel-collector.filenest-monitoring:4317"
```

---

## 3. Service Deployments

### 3.1 API Gateway Deployment

```yaml
# helm/templates/api-gateway/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: filenest-prod
  labels:
    app: api-gateway
    version: "{{ .Chart.AppVersion }}"
spec:
  replicas: {{ .Values.replicaCounts.apiGateway }}
  selector:
    matchLabels:
      app: api-gateway
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0       # Zero-downtime deploys
  template:
    metadata:
      labels:
        app: api-gateway
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values: [api-gateway]
                topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: api-gateway
      nodeSelector:
        role: api
      serviceAccountName: api-gateway
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      terminationGracePeriodSeconds: 60
      containers:
        - name: api-gateway
          image: "{{ .Values.global.image.registry }}/filenest/api-gateway:{{ .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.global.image.pullPolicy }}
          ports:
            - containerPort: 8000
              name: http
            - containerPort: 9090
              name: metrics
          env:
            - name: ENVIRONMENT
              value: "{{ .Values.global.environment }}"
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: filenest-db-credentials
                  key: host
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: filenest-db-credentials
                  key: password
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: filenest-redis
                  key: url
            - name: NATS_URL
              value: "nats://nats.filenest-data:4222"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "{{ .Values.opentelemetry.endpoint }}"
            - name: OTEL_SERVICE_NAME
              value: "api-gateway"
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
          resources:
            requests:
              cpu: "{{ .Values.resources.apiGateway.requests.cpu }}"
              memory: "{{ .Values.resources.apiGateway.requests.memory }}"
            limits:
              cpu: "{{ .Values.resources.apiGateway.limits.cpu }}"
              memory: "{{ .Values.resources.apiGateway.limits.memory }}"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 15
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 2
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "15"]  # Allow LB to drain connections
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

### 3.2 Processing Workers Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: processing-workers
  namespace: filenest-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: processing-workers
  template:
    spec:
      nodeSelector:
        role: processing
      tolerations:
        - key: "spot"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"
      containers:
        - name: worker
          image: "{{ .Values.global.image.registry }}/filenest/processing-worker:{{ .Chart.AppVersion }}"
          env:
            - name: WORKER_CONCURRENCY
              value: "10"
            - name: CLAMAV_HOST
              value: "clamav.filenest-data"
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "4Gi"
          livenessProbe:
            exec:
              command: ["python", "-m", "filenest.workers.health"]
            initialDelaySeconds: 30
            periodSeconds: 30
```

---

## 4. Autoscaling Strategy

### 4.1 HPA for API Services

```yaml
# helm/templates/api-gateway/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: {{ .Values.hpa.apiGateway.minReplicas }}
  maxReplicas: {{ .Values.hpa.apiGateway.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
    - type: Pods
      pods:
        metric:
          name: filenest_http_requests_in_flight
        target:
          type: AverageValue
          averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

### 4.2 KEDA for Processing Workers

```yaml
# helm/templates/processing-workers/keda-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: processing-workers-scaler
spec:
  scaleTargetRef:
    name: processing-workers
  minReplicaCount: 3
  maxReplicaCount: 100
  cooldownPeriod: 180
  pollingInterval: 15
  triggers:
    - type: nats-jetstream
      metadata:
        natsServerMonitoringEndpoint: "http://nats.filenest-data:8222"
        account: "$G"
        stream: FILENEST_EVENTS
        consumer: processing-workers
        lagThreshold: "50"
```

### 4.3 Pod Disruption Budgets

```yaml
# helm/templates/api-gateway/pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-gateway
```

---

## 5. Secrets Management

### 5.1 External Secrets Operator + AWS Secrets Manager

```yaml
# helm/templates/secrets/external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: filenest-db-credentials
  namespace: filenest-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: filenest-db-credentials
    creationPolicy: Owner
  data:
    - secretKey: host
      remoteRef:
        key: filenest/production/database
        property: host
    - secretKey: password
      remoteRef:
        key: filenest/production/database
        property: password
    - secretKey: username
      remoteRef:
        key: filenest/production/database
        property: username
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: filenest-api-secrets
  namespace: filenest-prod
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: filenest-api-secrets
  data:
    - secretKey: jwt_secret
      remoteRef:
        key: filenest/production/api
        property: jwt_secret
    - secretKey: encryption_key
      remoteRef:
        key: filenest/production/api
        property: encryption_key
    - secretKey: openai_api_key
      remoteRef:
        key: filenest/production/api
        property: openai_api_key
```

### 5.2 ClusterSecretStore

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

### 5.3 IRSA (IAM Roles for Service Accounts)

```yaml
# Each service gets its own IAM role via IRSA
apiVersion: v1
kind: ServiceAccount
metadata:
  name: file-service
  namespace: filenest-prod
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/filenest-file-service
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: processing-workers
  namespace: filenest-prod
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/filenest-processing-workers
```

### 5.4 IAM Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3FileStorage",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject",
        "s3:ListBucket",
        "s3:GetObjectLegalHold",
        "s3:PutObjectLegalHold"
      ],
      "Resource": [
        "arn:aws:s3:::filenest-files-prod/*",
        "arn:aws:s3:::filenest-files-prod"
      ]
    },
    {
      "Sid": "KMSEncryption",
      "Effect": "Allow",
      "Action": [
        "kms:GenerateDataKey",
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789:key/mrk-..."
    },
    {
      "Sid": "STSAssumeForBYOB",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/FileNestBYOBAccess"
    }
  ]
}
```

---

## 6. Networking and Ingress

### 6.1 Network Policies

```yaml
# Default-deny all ingress/egress in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: filenest-prod
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow ingress to API Gateway from load balancer only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-api-gateway
  namespace: filenest-prod
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8000
---
# Allow services to talk to PostgreSQL
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-postgres-egress
  namespace: filenest-prod
spec:
  podSelector:
    matchLabels:
      needs-db: "true"
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: filenest-data
      ports:
        - port: 5432
```

### 6.2 Ingress Configuration

```yaml
# helm/templates/ingress/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: filenest-api
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"         # Unlimited (for large uploads)
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"   # 1h for large uploads
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-request-buffering: "off"  # Stream large uploads
    nginx.ingress.kubernetes.io/rate-limit: "1000"           # Global rate limit
    nginx.ingress.kubernetes.io/rate-limit-burst-multiplier: "5"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.filenest.io
      secretName: filenest-api-tls
  rules:
    - host: api.filenest.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 8000
```

### 6.3 TLS Certificate Management

```yaml
# helm/templates/ingress/certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: filenest-api-tls
spec:
  secretName: filenest-api-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.filenest.io
    - "*.api.filenest.io"
```

---

## 7. Storage Configuration

### 7.1 PVC for NATS (JetStream)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: filenest-data
spec:
  serviceName: nats
  replicas: 3
  volumeClaimTemplates:
    - metadata:
        name: nats-data
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: gp3-encrypted
        resources:
          requests:
            storage: 100Gi
```

### 7.2 Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-encrypted
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:123456789:key/..."
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

---

## 8. Database in Kubernetes

### 8.1 RDS Connectivity via Service Entry

```yaml
# ExternalName service pointing to RDS
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
  namespace: filenest-data
spec:
  type: ExternalName
  externalName: filenest-prod.cluster-xxx.us-east-1.rds.amazonaws.com
  ports:
    - port: 5432
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-replica
  namespace: filenest-data
spec:
  type: ExternalName
  externalName: filenest-prod.cluster-ro-xxx.us-east-1.rds.amazonaws.com
  ports:
    - port: 5432
```

### 8.2 Alembic Migrations Job

```yaml
# Run migrations as a pre-install/upgrade Job
apiVersion: batch/v1
kind: Job
metadata:
  name: filenest-db-migrate
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 300
  template:
    spec:
      restartPolicy: Never
      serviceAccountName: filenest-migrator
      containers:
        - name: migrate
          image: "{{ .Values.global.image.registry }}/filenest/api-gateway:{{ .Chart.AppVersion }}"
          command: ["alembic", "upgrade", "head"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: filenest-db-credentials
                  key: url
```

---

## 9. Disaster Recovery

### 9.1 Targets

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 15 minutes |
| RPO (Recovery Point Objective) | 5 minutes |
| MTTR (Mean Time To Recovery) | < 30 minutes |
| Availability | 99.9% |

### 9.2 RDS Multi-AZ + Cross-Region Replica

```hcl
# terraform/modules/rds/main.tf
resource "aws_db_instance" "filenest_primary" {
  identifier                 = "filenest-prod"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = "db.r6g.2xlarge"
  allocated_storage          = 500
  storage_type               = "gp3"
  storage_encrypted          = true
  kms_key_id                 = aws_kms_key.rds.arn
  multi_az                   = true

  backup_retention_period    = 7
  backup_window              = "03:00-04:00"
  maintenance_window         = "Sun:04:00-Sun:05:00"

  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "filenest-prod-final"

  db_subnet_group_name       = aws_db_subnet_group.filenest.name
  vpc_security_group_ids     = [aws_security_group.rds.id]
  parameter_group_name       = aws_db_parameter_group.filenest.name
}

resource "aws_db_instance" "filenest_replica_eu" {
  identifier            = "filenest-prod-eu"
  replicate_source_db   = aws_db_instance.filenest_primary.identifier
  instance_class        = "db.r6g.xlarge"
  provider              = aws.eu_west_1
}
```

### 9.3 Velero Cluster Backups

```yaml
# Schedule: daily cluster resource backup
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: filenest-daily-backup
spec:
  schedule: "0 2 * * *"   # 2am UTC daily
  template:
    includedNamespaces:
      - filenest-prod
      - filenest-data
    storageLocation: aws-s3
    ttl: 720h   # 30 days
    snapshotVolumes: true
```

### 9.4 Failover Procedure

```
Regional Failover Runbook:
==========================

1. DETECT (automated, ~2 min)
   - CloudWatch alarm: us-east-1 health check failing
   - PagerDuty alert fires to on-call

2. CONFIRM (manual, ~3 min)
   - On-call confirms outage via status page
   - Triggers incident channel #incident-P1-<date>

3. DNS FAILOVER (Route53, ~1 min)
   - Route53 health check already configured
   - Traffic reroutes to eu-west-1 automatically
   - Or manually: aws route53 change-resource-record-sets ...

4. PROMOTE RDS REPLICA (manual, ~5 min)
   - aws rds promote-read-replica --db-instance-identifier filenest-prod-eu
   - Update DATABASE_URL secret in eu-west-1 cluster
   - kubectl rollout restart deployment --namespace filenest-prod

5. VERIFY (5 min)
   - Run smoke test suite against eu-west-1 endpoint
   - Check NATS JetStream is healthy
   - Verify search queries working

6. COMMUNICATE
   - Update status.filenest.io

TOTAL EXPECTED RTO: ~15 minutes
```

---

## 10. Deployment Workflow

### 10.1 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-cicd
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push images
        run: |
          IMAGE_TAG=${GITHUB_REF_NAME}
          for SERVICE in api-gateway processing-worker; do
            docker build \
              --file services/$SERVICE/Dockerfile \
              --tag ${{ steps.login-ecr.outputs.registry }}/filenest/$SERVICE:$IMAGE_TAG \
              --cache-from ${{ steps.login-ecr.outputs.registry }}/filenest/$SERVICE:latest \
              --build-arg BUILDKIT_INLINE_CACHE=1 \
              .
            docker push ${{ steps.login-ecr.outputs.registry }}/filenest/$SERVICE:$IMAGE_TAG
          done

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure EKS access
        run: aws eks update-kubeconfig --name filenest-production --region us-east-1

      - name: Helm upgrade
        run: |
          helm upgrade filenest ./helm \
            --namespace filenest-prod \
            --values helm/values.yaml \
            --values helm/values-production.yaml \
            --set global.image.tag=${GITHUB_REF_NAME} \
            --atomic \
            --timeout 10m \
            --wait

      - name: Run smoke tests
        run: |
          kubectl run smoke-test \
            --image=${{ steps.login-ecr.outputs.registry }}/filenest/smoke-tests:${GITHUB_REF_NAME} \
            --env API_URL=https://api.filenest.io \
            --env API_KEY=${{ secrets.SMOKE_TEST_API_KEY }} \
            --restart=Never \
            --rm \
            --attach \
            --namespace filenest-prod
```

### 10.2 Health Check Endpoints

```python
# services/shared/health.py
@router.get("/health/live")
async def liveness():
    """Minimal probe — returns 200 if process is alive."""
    return {"status": "alive"}

@router.get("/health/ready")
async def readiness(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Full dependency check — used by Kubernetes readiness probe."""
    checks = {}

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    is_ready = all(v == "ok" for v in checks.values())
    status_code = 200 if is_ready else 503

    return JSONResponse(
        content={"status": "ready" if is_ready else "not_ready", "checks": checks},
        status_code=status_code,
    )
```

### 10.3 Resource Quotas

```yaml
# Prevent resource exhaustion from misconfigured HPA
apiVersion: v1
kind: ResourceQuota
metadata:
  name: filenest-prod-quota
  namespace: filenest-prod
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    pods: "300"
```

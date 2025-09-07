# Deployment Guide

This guide covers deploying the Customer Churn Platform to various environments.

## Local Development

### Prerequisites
- Docker and Docker Compose
- Python 3.11+
- Node.js 18+

### Quick Start
```bash
# Clone repository
git clone <repo-url>
cd customer-churn-platform

# Start all services
docker-compose up -d

# Verify deployment
curl http://localhost:5000/health
open http://localhost:3000
```

## Production Deployment on AWS

### 1. Infrastructure Setup

#### Prerequisites
- AWS CLI configured
- Terraform installed
- Docker installed

#### Provision Infrastructure
```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply infrastructure
terraform apply
```

This creates:
- VPC with public/private subnets
- RDS PostgreSQL cluster
- ElastiCache Redis cluster
- ECS cluster
- Application Load Balancer
- Security groups and networking

### 2. Container Registry

#### Build and Push Images
```bash
# Get ECR login
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

# Build backend image
docker build -t churn-platform-backend ./backend
docker tag churn-platform-backend:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/churn-platform-backend:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/churn-platform-backend:latest

# Build frontend image
docker build -t churn-platform-frontend ./frontend
docker tag churn-platform-frontend:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/churn-platform-frontend:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/churn-platform-frontend:latest
```

### 3. ECS Service Deployment

#### Create Task Definitions
```bash
# Register backend task definition
aws ecs register-task-definition --cli-input-json file://infrastructure/backend-task-definition.json

# Register frontend task definition
aws ecs register-task-definition --cli-input-json file://infrastructure/frontend-task-definition.json
```

#### Create Services
```bash
# Create backend service
aws ecs create-service \
  --cluster churn-platform-cluster \
  --service-name churn-backend \
  --task-definition churn-platform-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=ENABLED}"

# Create frontend service
aws ecs create-service \
  --cluster churn-platform-cluster \
  --service-name churn-frontend \
  --task-definition churn-platform-frontend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
```

### 4. Database Setup

#### Initialize Database
```bash
# Connect to RDS instance
psql -h churn-db.cluster-xyz.us-west-2.rds.amazonaws.com -U postgres -d churn_analytics

# Run initialization script
\i data/init.sql
```

### 5. Load Balancer Configuration

#### Create Target Groups
```bash
# Backend target group
aws elbv2 create-target-group \
  --name churn-backend-tg \
  --protocol HTTP \
  --port 5000 \
  --vpc-id vpc-12345 \
  --health-check-path /health

# Frontend target group
aws elbv2 create-target-group \
  --name churn-frontend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-12345 \
  --health-check-path /
```

#### Configure Listeners
```bash
# Create listener for ALB
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-west-2:123456789012:loadbalancer/app/churn-platform-alb/1234567890123456 \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/churn-frontend-tg/1234567890123456
```

## Environment Variables

### Production Environment Variables
```bash
# Database
DATABASE_URL=postgresql://postgres:password@churn-db.cluster-xyz.us-west-2.rds.amazonaws.com:5432/churn_analytics

# Redis
REDIS_URL=redis://churn-redis.abc123.cache.amazonaws.com:6379/0

# MLflow
MLFLOW_TRACKING_URI=http://mlflow-alb-123456789.us-west-2.elb.amazonaws.com:5001

# AWS
AWS_DEFAULT_REGION=us-west-2

# Application
FLASK_ENV=production
FLASK_DEBUG=false
```

## Monitoring and Logging

### CloudWatch Setup
```bash
# Create log groups
aws logs create-log-group --log-group-name /ecs/churn-platform-backend
aws logs create-log-group --log-group-name /ecs/churn-platform-frontend
```

### Health Checks
- Backend: `http://load-balancer/health`
- Frontend: `http://load-balancer/`
- Database: Connection monitoring via RDS
- Redis: Connection monitoring via ElastiCache

## Scaling Configuration

### Auto Scaling
```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/churn-platform-cluster/churn-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/churn-platform-cluster/churn-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name churn-backend-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Security Configuration

### Security Groups
- ALB: Allow HTTP/HTTPS from internet
- ECS: Allow traffic from ALB only
- RDS: Allow traffic from ECS only
- Redis: Allow traffic from ECS only

### IAM Roles
- ECS Task Execution Role: ECR, CloudWatch Logs access
- ECS Task Role: S3, RDS, ElastiCache access

## Backup and Recovery

### Database Backups
- Automated backups enabled (7-day retention)
- Manual snapshots before deployments
- Point-in-time recovery available

### Application Backups
- Container images stored in ECR
- Configuration stored in Parameter Store
- Infrastructure code in version control

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
aws ecs describe-services --cluster churn-platform-cluster --services churn-backend

# Check task logs
aws logs get-log-events --log-group-name /ecs/churn-platform-backend --log-stream-name <stream-name>
```

#### Database Connection Issues
```bash
# Test database connectivity
psql -h churn-db.cluster-xyz.us-west-2.rds.amazonaws.com -U postgres -d churn_analytics -c "SELECT 1;"
```

#### Load Balancer Issues
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

## Rollback Procedures

### Application Rollback
```bash
# Update service to previous task definition
aws ecs update-service \
  --cluster churn-platform-cluster \
  --service churn-backend \
  --task-definition churn-platform-backend:1
```

### Database Rollback
```bash
# Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier churn-platform-cluster-restored \
  --snapshot-identifier churn-platform-snapshot-20240101
```

## Performance Tuning

### Database Optimization
- Connection pooling configured
- Read replicas for analytics queries
- Proper indexing on frequently queried columns

### Application Optimization
- Redis caching for frequent queries
- Async processing for heavy ML operations
- Connection pooling and keep-alive

### Infrastructure Optimization
- Multi-AZ deployment for high availability
- Auto Scaling based on CPU and memory
- CloudFront CDN for static assets

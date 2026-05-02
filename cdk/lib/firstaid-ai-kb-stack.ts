import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as s3vectors from 'aws-cdk-lib/aws-s3vectors';

export class FirstAidAiKbStack extends cdk.Stack {
  public readonly knowledgeBaseId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── S3 corpus bucket (source documents) ──
    const corpusBucket = new s3.Bucket(this, 'CorpusBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ── S3 Vectors bucket + index ──
    const vectorBucket = new s3vectors.CfnVectorBucket(this, 'VectorBucket', {
      vectorBucketName: `firstaid-ai-vectors-${this.account}`,
      encryptionConfiguration: { sseType: 'AES256' },
    });

    const vectorIndex = new s3vectors.CfnIndex(this, 'VectorIndex', {
      vectorBucketName: vectorBucket.vectorBucketName!,
      indexName: 'firstaid-ai-index',
      dataType: 'float32',
      dimension: 1024,
      distanceMetric: 'euclidean',
      metadataConfiguration: {
        nonFilterableMetadataKeys: [
          'AMAZON_BEDROCK_TEXT',
          'AMAZON_BEDROCK_METADATA',
        ],
      },
    });
    vectorIndex.addDependency(vectorBucket);

    // ── CloudWatch log group for KB ──
    const kbLogGroup = new logs.LogGroup(this, 'KbLogGroup', {
      logGroupName: '/aws/bedrock/firstaid-ai-kb',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── IAM role for Bedrock KB ──
    const kbRole = new iam.Role(this, 'KbRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com', {
        conditions: {
          StringEquals: { 'aws:SourceAccount': this.account },
          ArnLike: { 'aws:SourceArn': `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/*` },
        },
      }),
      description: 'Bedrock KB execution role for FirstAid AI',
    });

    kbRole.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockInvokeModel',
      actions: ['bedrock:InvokeModel'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`],
    }));
    kbRole.addToPolicy(new iam.PolicyStatement({
      sid: 'S3ListBucket',
      actions: ['s3:ListBucket'],
      resources: [corpusBucket.bucketArn],
      conditions: { StringEquals: { 'aws:ResourceAccount': this.account } },
    }));
    kbRole.addToPolicy(new iam.PolicyStatement({
      sid: 'S3GetObject',
      actions: ['s3:GetObject'],
      resources: [`${corpusBucket.bucketArn}/*`],
      conditions: { StringEquals: { 'aws:ResourceAccount': this.account } },
    }));
    kbRole.addToPolicy(new iam.PolicyStatement({
      sid: 'S3VectorsPermissions',
      actions: [
        's3vectors:GetIndex',
        's3vectors:QueryVectors',
        's3vectors:PutVectors',
        's3vectors:GetVectors',
        's3vectors:DeleteVectors',
      ],
      resources: [vectorIndex.attrIndexArn],
      conditions: { StringEquals: { 'aws:ResourceAccount': this.account } },
    }));

    // ── Bedrock Knowledge Base ──
    const kb = new bedrock.CfnKnowledgeBase(this, 'KnowledgeBase', {
      name: 'FirstAidAI-KB',
      description: 'FirstAid AI knowledge base — NHS, MedlinePlus, Mayo Clinic',
      roleArn: kbRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
          embeddingModelConfiguration: {
            bedrockEmbeddingModelConfiguration: { embeddingDataType: 'FLOAT32' },
          },
        },
      },
      storageConfiguration: {
        type: 'S3_VECTORS',
        s3VectorsConfiguration: {
          vectorBucketArn: vectorBucket.attrVectorBucketArn,
          indexArn: vectorIndex.attrIndexArn,
        },
      },
    });
    kb.node.addDependency(kbRole);
    kb.node.addDependency(vectorIndex);

    // ── Data Source ──
    const dataSource = new bedrock.CfnDataSource(this, 'DataSource', {
      knowledgeBaseId: kb.attrKnowledgeBaseId,
      name: 'firstaid-ai-corpus',
      description: 'S3 corpus: NHS + MedlinePlus + Mayo Clinic first-aid docs',
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: { bucketArn: corpusBucket.bucketArn },
      },
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: 'FIXED_SIZE',
          fixedSizeChunkingConfiguration: {
            maxTokens: 300,
            overlapPercentage: 20,
          },
        },
      },
      dataDeletionPolicy: 'DELETE',
    });

    // ── Outputs ──
    new cdk.CfnOutput(this, 'CorpusBucketName', {
      value: corpusBucket.bucketName,
      description: 'S3 bucket for corpus documents',
    });
    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: kb.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID',
    });
    new cdk.CfnOutput(this, 'DataSourceId', {
      value: dataSource.attrDataSourceId,
      description: 'Bedrock Data Source ID',
    });
    new cdk.CfnOutput(this, 'KbLogGroupName', {
      value: kbLogGroup.logGroupName,
      description: 'CloudWatch log group for KB',
    });
    new cdk.CfnOutput(this, 'KbRoleArn', {
      value: kbRole.roleArn,
      description: 'KB execution role ARN',
    });

    this.knowledgeBaseId = kb.attrKnowledgeBaseId;
  }
}

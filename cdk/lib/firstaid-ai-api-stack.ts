import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

interface FirstAidAiApiStackProps extends cdk.StackProps {
  /** Bedrock Knowledge Base ID from the KB stack */
  knowledgeBaseId: string;
  /** CloudFront distribution domain for CORS (e.g. "d1234abcdef.cloudfront.net") */
  allowedOrigin?: string;
}

export class FirstAidAiApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: FirstAidAiApiStackProps) {
    super(scope, id, props);

    const allowedOrigin = props.allowedOrigin ?? '*';

    // ── CloudWatch log group ──
    const logGroup = new logs.LogGroup(this, 'TriageLambdaLogs', {
      logGroupName: '/aws/lambda/firstaid-ai-triage',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Lambda execution role (least privilege) ──
    const lambdaRole = new iam.Role(this, 'TriageLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for firstaid-ai-triage Lambda',
    });

    // CloudWatch Logs
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [logGroup.logGroupArn, `${logGroup.logGroupArn}:*`],
    }));

    // Bedrock InvokeModel — scoped to Claude Sonnet
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockInvokeModel',
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`,
      ],
    }));

    // Bedrock KB Retrieve — scoped to the specific KB
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockKBRetrieve',
      actions: ['bedrock:Retrieve'],
      resources: [
        `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.knowledgeBaseId}`,
      ],
    }));

    // SSM GetParameter — scoped to Places API key
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      sid: 'SSMGetParameter',
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/firstaid-ai/places-api-key`,
      ],
    }));

    // ── Lambda function ──
    const triageFn = new lambda.Function(this, 'TriageLambda', {
      functionName: 'firstaid-ai-triage',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/dist')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      architecture: lambda.Architecture.X86_64,
      role: lambdaRole,
      logGroup,
      environment: {
        KNOWLEDGE_BASE_ID: props.knowledgeBaseId,
        CLAUDE_MODEL_ID: 'anthropic.claude-sonnet-4-20250514-v1:0',
        SIMILARITY_THRESHOLD: '0.5',
        PLACES_API_KEY_PARAM: '/firstaid-ai/places-api-key',
        ALLOWED_ORIGIN: allowedOrigin,
      },
    });

    // ── API Gateway HTTP API ──
    const httpApi = new apigwv2.HttpApi(this, 'TriageHttpApi', {
      apiName: 'firstaid-ai-api',
      corsPreflight: {
        allowOrigins: [allowedOrigin],
        allowMethods: [apigwv2.CorsHttpMethod.POST],
        allowHeaders: ['Content-Type'],
      },
    });

    httpApi.addRoutes({
      path: '/api/triage',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        'TriageLambdaIntegration',
        triageFn,
      ),
    });

    // ── Outputs ──
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: triageFn.functionName,
      description: 'Lambda function name',
    });
    new cdk.CfnOutput(this, 'LambdaRoleArn', {
      value: lambdaRole.roleArn,
      description: 'Lambda execution role ARN',
    });

    this.apiUrl = httpApi.apiEndpoint;
  }
}

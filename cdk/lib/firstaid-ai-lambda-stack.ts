import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

interface FirstAidAiLambdaStackProps extends cdk.StackProps {
  knowledgeBaseId: string;
}

export class FirstAidAiLambdaStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: FirstAidAiLambdaStackProps) {
    super(scope, id, props);

    // ── SSM Parameter for Google Places API Key ──
    // SecureString parameters can't be referenced via CloudFormation — use the name directly
    const placesApiKeyParamName = '/firstaid-ai/places-api-key';

    // ── IAM role for Lambda ──
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Lambda execution role for FirstAid AI triage function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Bedrock InvokeModel permission
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockInvokeModel',
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`,
        `arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`,
        `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`,
      ],
    }));

    // Bedrock KB Retrieve permission
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      sid: 'BedrockKBRetrieve',
      actions: ['bedrock-agent-runtime:Retrieve'],
      resources: [
        `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.knowledgeBaseId}`,
      ],
    }));

    // SSM GetParameter permission
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      sid: 'SSMGetParameter',
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/firstaid-ai/places-api-key`,
      ],
    }));

    // ── Lambda function ──
    const triageLambda = new lambda.Function(this, 'TriageLambda', {
      functionName: 'firstaid-ai-triage',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('../lambda_backend/dist/handler.zip'),
      memorySize: 512,
      timeout: Duration.seconds(15),
      architecture: lambda.Architecture.X86_64,
      role: lambdaRole,
      environment: {
        KNOWLEDGE_BASE_ID: props.knowledgeBaseId,
        CLAUDE_MODEL_ID: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        SIMILARITY_THRESHOLD: '0.5',
        PLACES_API_KEY_PARAM: placesApiKeyParamName,
        CLOUDFRONT_ORIGIN: '*', // Will be updated after CloudFront is deployed
      },
      description: 'FirstAid AI triage endpoint — parser + retrieval + formatter + places',
    });

    // ── API Gateway HTTP API ──
    const httpApi = new apigateway.HttpApi(this, 'TriageApi', {
      apiName: 'firstaid-ai-triage-api',
      description: 'HTTP API for FirstAid AI triage endpoint',
      corsPreflight: {
        allowOrigins: ['*'], // Will be restricted to CloudFront after deployment
        allowMethods: [apigateway.CorsHttpMethod.POST, apigateway.CorsHttpMethod.OPTIONS],
        allowHeaders: ['Content-Type'],
      },
    });

    // Add POST /api/triage route
    httpApi.addRoutes({
      path: '/api/triage',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        'TriageIntegration',
        triageLambda,
      ),
    });

    // ── Outputs ──
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: triageLambda.functionName,
      description: 'Lambda function name',
    });
    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: triageLambda.functionArn,
      description: 'Lambda function ARN',
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.url!,
      description: 'API Gateway HTTP API URL',
    });
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `${httpApi.url}api/triage`,
      description: 'Full triage endpoint URL',
    });
    new cdk.CfnOutput(this, 'PlacesApiKeyParamName', {
      value: placesApiKeyParamName,
      description: 'SSM parameter name for Places API key (set value manually)',
    });

    this.apiUrl = httpApi.url!;
  }
}
